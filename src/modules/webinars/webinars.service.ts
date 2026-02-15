import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Webinar, WebinarStatus } from '@prisma/client';
import { WebinarsRepository } from './webinars.repository';
import { CreateWebinarDto } from './dto/webinar/create-webinar.dto';
import { UpdateWebinarDto } from './dto/webinar/update-webinar.dto';
import { ListWebinarsQueryDto } from './dto/webinar/list-webinars-query.dto';
import { generateSlug } from '../../common/utils/slugify';

type PublicWebinarResponse = {
  title: string;
  slug: string;
  description: string;
  date: Date;
  duration: number;
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
  constructor(private readonly repo: WebinarsRepository) {}

  async create(dto: CreateWebinarDto): Promise<AdminWebinarResponse> {
    const slug = await this.generateUniqueSlug(dto.title);

    const webinar = await this.repo.create({
      ...dto,
      date: new Date(dto.date),
      slug,
      status: WebinarStatus.DRAFT,
    });

    return this.mapAdminResponse(webinar);
  }

  async findPublished(
    query: ListWebinarsQueryDto,
  ): Promise<PaginatedWebinarsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repo.findPublished({
        skip,
        take: limit,
        search,
      }),
      this.repo.countPublished(search),
    ]);

    return {
      data: items.map((item) => this.mapPublicResponse(item)),
      meta: {
        page,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findPublishedBySlug(slug: string): Promise<PublicWebinarResponse> {
    const webinar = await this.repo.findPublishedBySlug(slug);

    if (!webinar) {
      throw new NotFoundException('Webinar not found');
    }

    return this.mapPublicResponse(webinar);
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

    return this.mapAdminResponse(updated);
  }

  async publish(id: string): Promise<AdminWebinarResponse> {
    const existing = await this.ensureExists(id);

    if (existing.status === WebinarStatus.PUBLISHED) {
      return this.mapAdminResponse(existing);
    }

    const published = await this.repo.publish(id);

    return this.mapAdminResponse(published);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.repo.softDelete(id);
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

  private mapPublicResponse(webinar: Webinar): PublicWebinarResponse {
    return {
      title: webinar.title,
      slug: webinar.slug,
      description: webinar.description,
      date: webinar.date,
      duration: webinar.duration,
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
