import { Injectable } from '@nestjs/common';
import { LessonProgress } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent upsert — creates or updates a progress record.
   * Uses the @@unique([userId, lessonId]) constraint.
   */
  async upsertCompletion(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        completed: true,
        lastWatchedAt: new Date(),
      },
      update: {
        completed: true,
        lastWatchedAt: new Date(),
      },
    });
  }

  /**
   * Get all completed lesson IDs for a user in a specific course.
   * Joins through Lesson → CourseModule to resolve the course.
   */
  async findCompletedLessonIds(
    userId: string,
    courseId: string,
  ): Promise<string[]> {
    const records = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        completed: true,
        lesson: {
          module: { courseId },
        },
      },
      select: { lessonId: true },
    });

    return records.map((r) => r.lessonId);
  }

  /**
   * Count total lessons in a course (across all modules).
   */
  async countTotalLessons(courseId: string): Promise<number> {
    return this.prisma.lesson.count({
      where: {
        module: { courseId },
      },
    });
  }

  /**
   * Find a lesson and resolve its courseId via the module relationship.
   */
  async findLessonWithCourseId(
    lessonId: string,
  ): Promise<{ id: string; courseId: string } | null> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) return null;

    return { id: lesson.id, courseId: lesson.module.courseId };
  }
}
