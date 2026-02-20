import { Injectable } from '@nestjs/common';
import { Course, CourseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type { Course };

/**
 * Narrow projection used for public listing queries.
 * Only the columns consumed by the public response mapper are fetched,
 * keeping each row small and I/O low under high read load.
 */
export const courseListSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  bannerImage: true,
  price: true,
  discountPrice: true,
  duration: true,
  startDate: true,
  classDays: true,
  classTime: true,
  totalModules: true,
  totalProjects: true,
  totalLive: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourseSelect;

/** TypeScript type inferred from the listing projection */
export type CourseListItem = Prisma.CourseGetPayload<{
  select: typeof courseListSelect;
}>;

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CourseUncheckedCreateInput): Promise<Course> {
    return this.prisma.course.create({ data });
  }

  async findById(id: string): Promise<Course | null> {
    return this.prisma.course.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  async findPublishedBySlug(slug: string): Promise<Course | null> {
    return this.prisma.course.findFirst({
      where: {
        slug,
        status: CourseStatus.PUBLISHED,
        isDeleted: false,
      },
    });
  }

  async findSlugConflicts(
    baseSlug: string,
  ): Promise<Array<{ id: string; slug: string }>> {
    return this.prisma.course.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
  }

  /**
   * Offset-based published listing with a narrow SELECT.
   * Use `findPublishedWithCursor` for high-volume / deep-pagination scenarios.
   */
  async findPublished(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<CourseListItem[]> {
    const { skip, take, search } = params;

    const where: Prisma.CourseWhereInput = {
      isDeleted: false,
      status: CourseStatus.PUBLISHED,
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: courseListSelect,
    });
  }

  /**
   * Cursor-based listing — O(log n) regardless of page depth.
   *
   * Returns `nextCursor` (the last item's id) to pass on the next request.
   * When `nextCursor` is null the client has reached the last page.
   *
   * @example
   *   // First page
   *   const { items, nextCursor } = await repo.findPublishedWithCursor({ take: 10 });
   *   // Subsequent pages
   *   const next = await repo.findPublishedWithCursor({ take: 10, cursor: nextCursor });
   */
  async findPublishedWithCursor(params: {
    take: number;
    cursor?: string;
    search?: string;
  }): Promise<{ items: CourseListItem[]; nextCursor: string | null }> {
    const { take, cursor, search } = params;

    const where: Prisma.CourseWhereInput = {
      isDeleted: false,
      status: CourseStatus.PUBLISHED,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    // Fetch one extra row to know if a next page exists
    const rows = await this.prisma.course.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: courseListSelect,
    });

    const hasNextPage = rows.length > take;
    const items = hasNextPage ? rows.slice(0, take) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async countPublished(search?: string): Promise<number> {
    const where: Prisma.CourseWhereInput = {
      isDeleted: false,
      status: CourseStatus.PUBLISHED,
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.course.count({ where });
  }

  async update(id: string, data: Prisma.CourseUpdateInput): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async publish(id: string): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
      },
    });
  }

  async softDelete(id: string): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }
}
