import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class CourseAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getEnrollmentCount(courseId: string): Promise<number> {
    return this.prisma.enrollment.count({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  async getTotalLessons(courseId: string): Promise<number> {
    return this.prisma.lesson.count({
      where: {
        module: { courseId },
      },
    });
  }

  async getStudentsStarted(courseId: string): Promise<number> {
    const groups = await this.prisma.lessonProgress.groupBy({
      by: ['userId'],
      where: {
        completed: true,
        lesson: {
          module: { courseId },
        },
      },
    });

    return groups.length;
  }

  async getStudentsCompleted(
    courseId: string,
    totalLessons: number,
  ): Promise<number> {
    if (totalLessons <= 0) {
      return 0;
    }

    const groups = await this.prisma.lessonProgress.groupBy({
      by: ['userId'],
      where: {
        completed: true,
        lesson: {
          module: { courseId },
        },
      },
      _count: {
        lessonId: true,
      },
      having: {
        lessonId: {
          _count: {
            equals: totalLessons,
          },
        },
      } satisfies Prisma.LessonProgressScalarWhereWithAggregatesInput,
    });

    return groups.length;
  }
}
