import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Course, CourseStatus, Prisma } from '@prisma/client';

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

  async findPublished(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<Course[]> {
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
      orderBy: {
        createdAt: 'desc',
      },
    });
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
