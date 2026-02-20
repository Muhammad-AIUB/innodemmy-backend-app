import { Injectable } from '@nestjs/common';
import { Lesson, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type LessonWithDetails = {
  id: string;
  title: string;
  type: LessonType;
  videoUrl: string | null;
  moduleId: string;
};

@Injectable()
export class LessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LessonUncheckedCreateInput): Promise<Lesson> {
    return this.prisma.lesson.create({ data });
  }

  async findById(id: string): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({
      where: { id },
    });
  }

  /**
   * Fetch all lessons for a given course by joining through modules.
   * Uses the moduleId index implicitly via the relation.
   */
  async findByCourseId(courseId: string): Promise<LessonWithDetails[]> {
    return this.prisma.lesson.findMany({
      where: {
        module: {
          courseId,
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        videoUrl: true,
        moduleId: true,
      },
      orderBy: { moduleId: 'asc' },
    });
  }

  async findByModuleId(moduleId: string): Promise<LessonWithDetails[]> {
    return this.prisma.lesson.findMany({
      where: { moduleId },
      select: {
        id: true,
        title: true,
        type: true,
        videoUrl: true,
        moduleId: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lesson.delete({ where: { id } });
  }
}
