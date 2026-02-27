import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type ActiveCourseEnrollmentRow = {
  userId: string;
  enrolledAt: Date;
  name: string | null;
  email: string;
};

export type CompletedLessonCountByUserRow = {
  userId: string;
  completedLessons: number;
};

@Injectable()
export class CourseEnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveCourseEnrollments(
    courseId: string,
  ): Promise<ActiveCourseEnrollmentRow[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        userId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      userId: row.userId,
      enrolledAt: row.createdAt,
      name: row.user.name,
      email: row.user.email,
    }));
  }

  async countCourseLessons(courseId: string): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: {
        module: { courseId },
      },
      _count: {
        id: true,
      },
    });

    return result._count.id;
  }

  async getCompletedLessonCountsByUser(
    courseId: string,
  ): Promise<CompletedLessonCountByUserRow[]> {
    const rows = await this.prisma.lessonProgress.groupBy({
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
    });

    return rows.map((row) => ({
      userId: row.userId,
      completedLessons: row._count.lessonId,
    }));
  }
}
