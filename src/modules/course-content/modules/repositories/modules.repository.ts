import { Injectable } from '@nestjs/common';
import { CourseModule, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type ModuleWithCourse = CourseModule & {
  course: { createdById: string };
};

export type LessonSummary = {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  videoUrl: string | null;
  moduleId: string;
};

export type ModuleWithLessons = {
  id: string;
  title: string;
  order: number;
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
    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return modules.map((mod, modIndex) => ({
      id: mod.id,
      title: mod.title,
      order: modIndex,
      courseId: mod.courseId,
      lessons: mod.lessons.map((lesson, lessonIndex) => ({
        id: lesson.id,
        title: lesson.title,
        order: lessonIndex,
        type: lesson.type,
        videoUrl: lesson.videoUrl,
        moduleId: lesson.moduleId,
      })),
    }));
  }

  /**
   * Get the maximum order value for modules in a course.
   */
  async getMaxOrder(courseId: string): Promise<number> {
    const result = await this.prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const count = await this.prisma.courseModule.count({ where: { courseId } });
    return result ? count - 1 : -1;
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
