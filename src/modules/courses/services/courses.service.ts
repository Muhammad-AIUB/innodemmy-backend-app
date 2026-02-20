import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, UserRole } from '@prisma/client';
import {
  Course,
  CourseListItem,
  CoursesRepository,
} from '../repositories/courses.repository';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { ListCoursesQueryDto } from '../queries/course.query';
import { generateSlug } from '../../../common/utils/slugify';
import { CacheService } from '../../../shared/cache/cache.service';

/** TTL constants (milliseconds) */
const CACHE_LIST_TTL = 5 * 60_000;
const CACHE_ITEM_TTL = 10 * 60_000;
const CACHE_PREFIX = 'courses:';

type PublicCourseResponse = {
  title: string;
  slug: string;
  description: string;
  bannerImage: string;
  price: number;
  discountPrice: number | null;
  duration: number;
  startDate: Date;
  classDays: string;
  classTime: string;
  totalModules: number;
  totalProjects: number;
  totalLive: number;
};

type AdminCourseResponse = PublicCourseResponse & {
  id: string;
  status: CourseStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedCoursesResponse = {
  data: PublicCourseResponse[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class CoursesService {
  constructor(
    private readonly repo: CoursesRepository,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateCourseDto,
    userId: string,
  ): Promise<AdminCourseResponse> {
    const slug = await this.generateUniqueSlug(dto.title);

    const course = await this.repo.create({
      title: dto.title,
      description: dto.description,
      bannerImage: dto.bannerImage,
      price: dto.price,
      discountPrice: dto.discountPrice,
      duration: dto.duration,
      startDate: new Date(dto.startDate),
      classDays: dto.classDays,
      classTime: dto.classTime,
      totalModules: dto.totalModules,
      totalProjects: dto.totalProjects,
      totalLive: dto.totalLive,
      slug,
      status: CourseStatus.DRAFT,
      createdById: userId,
    });

    // Invalidate public listing caches — a new draft may eventually show up
    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(course);
  }

  /**
   * Public listing — results are cached per page/limit/search key.
   * Cache is automatically invalidated on any mutation.
   */
  async findPublished(
    query: ListCoursesQueryDto,
  ): Promise<PaginatedCoursesResponse> {
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
   * Public single-course lookup by slug — cached per slug.
   */
  async findPublishedBySlug(slug: string): Promise<PublicCourseResponse> {
    return this.cache.wrap(
      `${CACHE_PREFIX}public:slug:${slug}`,
      async () => {
        const course = await this.repo.findPublishedBySlug(slug);
        if (!course) {
          throw new NotFoundException('Course not found');
        }
        return this.mapPublicResponse(course);
      },
      CACHE_ITEM_TTL,
    );
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    userId: string,
    userRole: UserRole,
  ): Promise<AdminCourseResponse> {
    const existing = await this.ensureExistsAndAuthorized(id, userId, userRole);

    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      updateData.title = dto.title;
      updateData.slug = await this.generateUniqueSlug(dto.title, existing.id);
    }

    if (
      dto.description !== undefined &&
      dto.description !== existing.description
    ) {
      updateData.description = dto.description;
    }

    if (
      dto.bannerImage !== undefined &&
      dto.bannerImage !== existing.bannerImage
    ) {
      updateData.bannerImage = dto.bannerImage;
    }

    if (dto.price !== undefined && dto.price !== existing.price) {
      updateData.price = dto.price;
    }

    if (
      dto.discountPrice !== undefined &&
      dto.discountPrice !== existing.discountPrice
    ) {
      updateData.discountPrice = dto.discountPrice;
    }

    if (dto.duration !== undefined && dto.duration !== existing.duration) {
      updateData.duration = dto.duration;
    }

    if (dto.startDate !== undefined) {
      const nextDate = new Date(dto.startDate);
      if (nextDate.getTime() !== existing.startDate.getTime()) {
        updateData.startDate = nextDate;
      }
    }

    if (dto.classDays !== undefined && dto.classDays !== existing.classDays) {
      updateData.classDays = dto.classDays;
    }

    if (dto.classTime !== undefined && dto.classTime !== existing.classTime) {
      updateData.classTime = dto.classTime;
    }

    if (
      dto.totalModules !== undefined &&
      dto.totalModules !== existing.totalModules
    ) {
      updateData.totalModules = dto.totalModules;
    }

    if (
      dto.totalProjects !== undefined &&
      dto.totalProjects !== existing.totalProjects
    ) {
      updateData.totalProjects = dto.totalProjects;
    }

    if (dto.totalLive !== undefined && dto.totalLive !== existing.totalLive) {
      updateData.totalLive = dto.totalLive;
    }

    if (Object.keys(updateData).length === 0) {
      return this.mapAdminResponse(existing);
    }

    const updated = await this.repo.update(id, updateData);

    // Blow away all course cache entries (listings + slug cache)
    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(updated);
  }

  async publish(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AdminCourseResponse> {
    const existing = await this.ensureExistsAndAuthorized(id, userId, userRole);

    if (existing.status === CourseStatus.PUBLISHED) {
      return this.mapAdminResponse(existing);
    }

    const published = await this.repo.publish(id);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(published);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    await this.ensureExistsAndAuthorized(id, userId, userRole);

    await this.repo.softDelete(id);

    this.cache.delByPrefix(CACHE_PREFIX);
  }

  private async ensureExistsAndAuthorized(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.repo.findById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN && course.createdById !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this course',
      );
    }

    return course;
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

  /**
   * Accepts both the narrow `CourseListItem` (from listing queries) and
   * the full `Course` object (from admin/detail queries).
   * TypeScript's structural typing ensures both satisfy the parameter.
   */
  private mapPublicResponse(course: CourseListItem): PublicCourseResponse {
    return {
      title: course.title,
      slug: course.slug,
      description: course.description,
      bannerImage: course.bannerImage,
      price: course.price,
      discountPrice: course.discountPrice,
      duration: course.duration,
      startDate: course.startDate,
      classDays: course.classDays,
      classTime: course.classTime,
      totalModules: course.totalModules,
      totalProjects: course.totalProjects,
      totalLive: course.totalLive,
    };
  }

  private mapAdminResponse(course: Course): AdminCourseResponse {
    return {
      id: course.id,
      ...this.mapPublicResponse(course),
      status: course.status,
      createdById: course.createdById,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
