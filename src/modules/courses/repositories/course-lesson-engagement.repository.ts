import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type LessonEngagementCompletionRow = {
  lessonId: string;
  completedCount: number;
};

export type LessonEngagementLessonRow = {
  lessonId: string;
  title: string;
};

export type LessonEngagementModuleRow = {
  moduleId: string;
  moduleTitle: string;
  lessons: LessonEngagementLessonRow[];
};

@Injectable()
export class CourseLessonEngagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countActiveEnrollments(courseId: string): Promise<number> {
    return this.prisma.enrollment.count({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  async findCompletedCountsByLesson(
    courseId: string,
  ): Promise<LessonEngagementCompletionRow[]> {
    const rows = await this.prisma.lessonProgress.groupBy({
      by: ['lessonId'],
      where: {
        completed: true,
        lesson: {
          module: { courseId },
        },
        user: {
          enrollments: {
            some: {
              courseId,
              status: EnrollmentStatus.ACTIVE,
            },
          },
        },
      },
      _count: {
        lessonId: true,
      },
    });

    return rows.map((row) => ({
      lessonId: row.lessonId,
      completedCount: row._count.lessonId,
    }));
  }

  async findModuleLessonTree(
    courseId: string,
  ): Promise<LessonEngagementModuleRow[]> {
    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        lessons: {
          select: {
            id: true,
            title: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return modules.map((module) => ({
      moduleId: module.id,
      moduleTitle: module.title,
      lessons: module.lessons.map((lesson) => ({
        lessonId: lesson.id,
        title: lesson.title,
      })),
    }));
  }
}
