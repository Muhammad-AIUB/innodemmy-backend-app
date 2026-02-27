import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type CourseStudentLessonRow = {
  lessonId: string;
  title: string;
};

export type CourseStudentModuleRow = {
  moduleId: string;
  title: string;
  lessons: CourseStudentLessonRow[];
};

export type ActiveEnrollmentStudentRow = {
  userId: string;
  name: string | null;
  email: string;
};

@Injectable()
export class CourseStudentProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCourseModulesWithLessons(
    courseId: string,
  ): Promise<CourseStudentModuleRow[]> {
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
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        lessonId: lesson.id,
        title: lesson.title,
      })),
    }));
  }

  async findCompletedLessonIdsForUserInCourse(
    courseId: string,
    userId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        completed: true,
        lesson: {
          module: { courseId },
        },
      },
      select: {
        lessonId: true,
      },
    });

    return rows.map((row) => row.lessonId);
  }

  async findActiveEnrollmentStudent(
    courseId: string,
    userId: string,
  ): Promise<ActiveEnrollmentStudentRow | null> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        courseId,
        userId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment) {
      return null;
    }

    return {
      userId: enrollment.userId,
      name: enrollment.user.name,
      email: enrollment.user.email,
    };
  }
}
