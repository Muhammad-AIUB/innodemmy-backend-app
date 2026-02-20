import { Injectable } from '@nestjs/common';
import { CourseModule, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type ModuleWithCourse = CourseModule & {
  course: { createdById: string };
};

export type LessonSummary = {
  id: string;
  title: string;
  type: LessonType;
  videoUrl: string | null;
  moduleId: string;
};

export type ModuleWithLessons = {
  id: string;
  title: string;
  courseId: string;
  lessons: LessonSummary[];
};

@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CourseModuleUncheckedCreateInput,
  ): Promise<CourseModule> {
    return this.prisma.courseModule.create({ data });
  }

  /**
   * Find a module with its parent course ownership info.
   */
  async findById(id: string): Promise<ModuleWithCourse | null> {
    return this.prisma.courseModule.findFirst({
      where: { id },
      include: {
        course: {
          select: { createdById: true },
        },
      },
    }) as Promise<ModuleWithCourse | null>;
  }

  /**
   * Find all modules for a course, each with their lessons.
   * Single query — no N+1.
   */
  async findByCourseIdWithLessons(
    courseId: string,
  ): Promise<ModuleWithLessons[]> {
    return this.prisma.courseModule.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        courseId: true,
        lessons: {
          select: {
            id: true,
            title: true,
            type: true,
            videoUrl: true,
            moduleId: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    }) as Promise<ModuleWithLessons[]>;
  }

  async update(
    id: string,
    data: Prisma.CourseModuleUpdateInput,
  ): Promise<CourseModule> {
    return this.prisma.courseModule.update({ where: { id }, data });
  }

  /**
   * Hard-delete a module.
   * Caller must delete related lessons first (use a transaction).
   */
  async delete(id: string): Promise<void> {
    await this.prisma.courseModule.delete({ where: { id } });
  }
}
