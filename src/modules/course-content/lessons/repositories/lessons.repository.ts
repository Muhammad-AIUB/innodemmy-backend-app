import { Injectable } from '@nestjs/common';
import { Lesson, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

/**
 * Lesson record enriched with its module's course ownership info.
 * Used for ownership validation in service layer.
 */
export type LessonWithOwnership = Lesson & {
  module: {
    courseId: string;
    course: { createdById: string };
  };
};

export type LessonResult = {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  videoUrl: string | null;
  moduleId: string;
  content: Prisma.JsonValue | null;
};

export type LessonDetailResult = LessonResult & {
  courseId: string;
};

@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a lesson with ownership info for the service layer checks.
   */
  async findByIdWithOwnership(id: string): Promise<LessonWithOwnership | null> {
    return this.prisma.lesson.findFirst({
      where: { id },
      include: {
        module: {
          select: {
            courseId: true,
            course: { select: { createdById: true } },
          },
        },
      },
    }) as Promise<LessonWithOwnership | null>;
  }

  async findById(id: string): Promise<LessonResult | null> {
    return this.prisma.lesson.findFirst({
      where: { id },
      select: {
        id: true,
        title: true,
        order: true,
        type: true,
        videoUrl: true,
        moduleId: true,
        content: true,
      },
    });
  }

  async findByIdWithCourse(id: string): Promise<LessonDetailResult | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id },
      select: {
        id: true,
        title: true,
        order: true,
        type: true,
        videoUrl: true,
        moduleId: true,
        content: true,
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) {
      return null;
    }

    return {
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      type: lesson.type,
      videoUrl: lesson.videoUrl,
      moduleId: lesson.moduleId,
      content: lesson.content,
      courseId: lesson.module.courseId,
    };
  }

  async update(
    id: string,
    data: Prisma.LessonUpdateInput,
  ): Promise<LessonResult> {
    return this.prisma.lesson.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        order: true,
        type: true,
        videoUrl: true,
        moduleId: true,
        content: true,
      },
    });
  }

  /**
   * Get the maximum order value for lessons in a module.
   */
  async getMaxOrder(moduleId: string): Promise<number> {
    const result: { _max: { order: number | null } } =
      await this.prisma.lesson.aggregate({
        where: { moduleId },
        _max: { order: true },
      });
    const maxOrder = result._max.order;
    if (typeof maxOrder === 'number' && !isNaN(maxOrder)) {
      return maxOrder;
    }
    return -1;
  }
}
