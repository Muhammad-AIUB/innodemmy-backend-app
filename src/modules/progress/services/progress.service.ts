import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { EnrollmentRepository } from '../../enrollments/repositories/enrollment.repository';
import { ProgressRepository } from '../repositories/progress.repository';

export type CourseProgressResponse = {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completedLessonIds: string[];
};

export type MarkLessonCompleteResponse = {
  lessonId: string;
  completed: boolean;
  lastWatchedAt: string;
};

@Injectable()
export class ProgressService {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<CourseProgressResponse> {
    // 1. Verify course exists
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    // 2. Verify active enrollment
    const enrollment = await this.enrollmentRepo.findActiveEnrollment(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course.');
    }

    // 3. Compute progress
    const [completedLessonIds, totalLessons] = await Promise.all([
      this.repo.findCompletedLessonIds(userId, courseId),
      this.repo.countTotalLessons(courseId),
    ]);

    const completedLessons = completedLessonIds.length;
    const percentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    return {
      courseId,
      completedLessons,
      totalLessons,
      percentage,
      completedLessonIds,
    };
  }

  async markLessonComplete(
    userId: string,
    lessonId: string,
  ): Promise<MarkLessonCompleteResponse> {
    // 1. Validate lesson exists and resolve courseId
    const lesson = await this.repo.findLessonWithCourseId(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    // 2. Verify active enrollment
    const enrollment = await this.enrollmentRepo.findActiveEnrollment(
      userId,
      lesson.courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in the course for this lesson.',
      );
    }

    // 3. Upsert progress (idempotent)
    const progress = await this.repo.upsertCompletion(userId, lessonId);

    return {
      lessonId: progress.lessonId,
      completed: progress.completed,
      lastWatchedAt: progress.lastWatchedAt.toISOString(),
    };
  }
}
