import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Webinar, WebinarStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WebinarsRepository, WebinarListItem } from './webinars.repository';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';
import { ListWebinarsQueryDto } from './dto/list-webinars-query.dto';
import { generateSlug } from '../../common/utils/slugify';
import { NotificationService } from '../notification/services/notification.service';
import { CacheService } from '../../shared/cache/cache.service';

/** TTL constants (milliseconds) */
const CACHE_LIST_TTL = 5 * 60_000; // 5 min — public listings
const CACHE_ITEM_TTL = 10 * 60_000; // 10 min — individual items
const CACHE_PREFIX = 'webinars:';

type PublicWebinarResponse = {
  title: string;
  slug: string;
  description: string;
  image?: string | null;
  date: Date;
  duration: number;
  time?: string | null;
  instructor?: string | null;
  instructorImage?: string | null;
  category?: string | null;
  isUpcoming?: boolean;
  sectionOneTitle: string | null;
  sectionOnePoints: string[];
  sectionTwoTitle: string | null;
  sectionTwoPoints: string[];
};

type AdminWebinarResponse = PublicWebinarResponse & {
  id: string;
  status: WebinarStatus;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedWebinarsResponse = {
  data: PublicWebinarResponse[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class WebinarsService {
  private readonly logger = new Logger(WebinarsService.name);

  constructor(
    private readonly repo: WebinarsRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateWebinarDto): Promise<AdminWebinarResponse> {
    const slug = await this.generateUniqueSlug(dto.title);

    const webinar = await this.repo.create({
      ...dto,
      date: new Date(dto.date),
      slug,
      status: WebinarStatus.DRAFT,
    });

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(webinar);
  }

  /**
   * Public listing — results are cached per page/limit/search key.
   * Cache is automatically invalidated on any mutation.
   */
  async findPublished(
    query: ListWebinarsQueryDto,
  ): Promise<PaginatedWebinarsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() ?? '';
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}public:list:${page}:${limit}:${search}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const [items, total] = await Promise.all([
          this.repo.findPublished({
            skip,
            take: limit,
            search: search || undefined,
          }),
          this.repo.countPublished(search || undefined),
        ]);

        return {
          data: items.map((item) => this.mapPublicResponse(item)),
          meta: {
            page,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          },
        };
      },
      CACHE_LIST_TTL,
    );
  }

  /**
   * Public single-webinar lookup by slug — cached per slug.
   */
  async findPublishedBySlug(slug: string): Promise<PublicWebinarResponse> {
    return this.cache.wrap(
      `${CACHE_PREFIX}public:slug:${slug}`,
      async () => {
        const webinar = await this.repo.findPublishedBySlug(slug);
        if (!webinar) {
          throw new NotFoundException('Webinar not found');
        }
        return this.mapPublicResponse(webinar);
      },
      CACHE_ITEM_TTL,
    );
  }

  async update(
    id: string,
    dto: UpdateWebinarDto,
  ): Promise<AdminWebinarResponse> {
    const existing = await this.ensureExists(id);

    const updateData: Prisma.WebinarUpdateInput = {};
    let hasChanges = false;

    if (dto.title) {
      if (dto.title !== existing.title) {
        updateData.title = dto.title;
        hasChanges = true;
      }

      if (dto.title !== existing.title) {
        updateData.slug = await this.generateUniqueSlug(dto.title, existing.id);
      }
    }

    if (
      dto.description !== undefined &&
      dto.description !== existing.description
    ) {
      updateData.description = dto.description;
      hasChanges = true;
    }

    if (dto.date !== undefined) {
      const nextDate = new Date(dto.date);
      if (nextDate.getTime() !== existing.date.getTime()) {
        updateData.date = nextDate;
        hasChanges = true;
      }
    }

    if (dto.duration !== undefined && dto.duration !== existing.duration) {
      updateData.duration = dto.duration;
      hasChanges = true;
    }

    if (
      dto.sectionOneTitle !== undefined &&
      dto.sectionOneTitle !== existing.sectionOneTitle
    ) {
      updateData.sectionOneTitle = dto.sectionOneTitle;
      hasChanges = true;
    }

    if (
      dto.sectionOnePoints !== undefined &&
      !this.areStringArraysEqual(
        dto.sectionOnePoints,
        existing.sectionOnePoints,
      )
    ) {
      updateData.sectionOnePoints = dto.sectionOnePoints;
      hasChanges = true;
    }

    if (
      dto.sectionTwoTitle !== undefined &&
      dto.sectionTwoTitle !== existing.sectionTwoTitle
    ) {
      updateData.sectionTwoTitle = dto.sectionTwoTitle;
      hasChanges = true;
    }

    if (
      dto.sectionTwoPoints !== undefined &&
      !this.areStringArraysEqual(
        dto.sectionTwoPoints,
        existing.sectionTwoPoints,
      )
    ) {
      updateData.sectionTwoPoints = dto.sectionTwoPoints;
      hasChanges = true;
    }

    if (!hasChanges) {
      return this.mapAdminResponse(existing);
    }

    const updated = await this.repo.update(id, updateData);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(updated);
  }

  async publish(id: string): Promise<AdminWebinarResponse> {
    const existing = await this.ensureExists(id);

    if (existing.status === WebinarStatus.PUBLISHED) {
      return this.mapAdminResponse(existing);
    }

    const published = await this.repo.publish(id);

    // Fire-and-forget: send notifications to all active users
    void this.fireWebinarPublishedNotification(published);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(published);
  }

  private async fireWebinarPublishedNotification(
    webinar: Webinar,
  ): Promise<void> {
    try {
      const recipients = await this.prisma.user.findMany({
        where: { isActive: true, isDeleted: false },
        select: { id: true, name: true, email: true },
      });

      if (recipients.length) {
        await this.notificationService.onWebinarPublished({
          webinar: { id: webinar.id, title: webinar.title, date: webinar.date },
          recipients,
        });
      }
    } catch (err) {
      this.logger.error(
        `[fireWebinarPublishedNotification] ${(err as Error).message}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.repo.softDelete(id);

    this.cache.delByPrefix(CACHE_PREFIX);
  }

  private async ensureExists(id: string) {
    const webinar = await this.repo.findById(id);

    if (!webinar) {
      throw new NotFoundException('Webinar not found');
    }

    return webinar;
  }

  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = generateSlug(title);
    const conflicts = await this.repo.findSlugConflicts(baseSlug);

    const used = new Set<string>();

    for (const conflict of conflicts) {
      if (excludeId && conflict.id === excludeId) {
        continue;
      }

      used.add(conflict.slug);
    }

    if (!used.has(baseSlug)) {
      return baseSlug;
    }

    let counter = 1;
    let candidate = `${baseSlug}-${counter}`;

    while (used.has(candidate)) {
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }

    return candidate;
  }

  private areStringArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => item === right[index]);
  }

  /**
   * Accepts both `WebinarListItem` (narrow listing rows) and full `Webinar`
   * objects. TypeScript structural typing ensures both satisfy the parameter.
   */
  private mapPublicResponse(webinar: WebinarListItem): PublicWebinarResponse {
    return {
      title: webinar.title,
      slug: webinar.slug,
      description: webinar.description,
      image: webinar.image ?? null,
      date: webinar.date,
      duration: webinar.duration,
      time: webinar.time ?? null,
      instructor: webinar.instructor ?? null,
      instructorImage: webinar.instructorImage ?? null,
      category: (webinar as any).category ?? null,
      isUpcoming: (webinar as any).isUpcoming ?? false,
      sectionOneTitle: webinar.sectionOneTitle,
      sectionOnePoints: webinar.sectionOnePoints,
      sectionTwoTitle: webinar.sectionTwoTitle,
      sectionTwoPoints: webinar.sectionTwoPoints,
    };
  }

  private mapAdminResponse(webinar: Webinar): AdminWebinarResponse {
    return {
      id: webinar.id,
      ...this.mapPublicResponse(webinar),
      status: webinar.status,
      createdAt: webinar.createdAt,
      updatedAt: webinar.updatedAt,
    };
  }
}
