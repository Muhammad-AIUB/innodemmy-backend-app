import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Enrollment, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { NotificationService } from '../../notification/services/notification.service';

export type EnrollmentResponse = {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledById: string | null;
  createdAt: Date;
};

export type MyEnrollmentResponse = {
  courseId: string;
  enrolledAt: Date;
};

function mapEnrollment(enrollment: Enrollment): EnrollmentResponse {
  return {
    id: enrollment.id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    status: enrollment.status,
    enrolledById: enrollment.enrolledById,
    createdAt: enrollment.createdAt,
  };
}

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly repo: EnrollmentRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * STUDENT: self-enroll in a published course.
   * Creates enrollment with PENDING status.
   */
  async enrollSelf(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentResponse> {
    // 1. Verify course exists and is published
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot enroll in an unpublished course.');
    }

    // 2. Prevent duplicate enrollment
    const existing = await this.repo.findByUserAndCourse(userId, courseId);
    if (existing) {
      throw new ConflictException('You are already enrolled in this course.');
    }

    // 3. Create enrollment
    const enrollment = await this.repo.create({
      userId,
      courseId,
      status: EnrollmentStatus.PENDING,
    });

    return mapEnrollment(enrollment);
  }

  /**
   * ADMIN: manually enroll a student in a published course with PENDING status.
   */
  async enrollStudent(
    adminId: string,
    studentId: string,
    courseId: string,
  ): Promise<EnrollmentResponse> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot enroll in an unpublished course.');
    }

    const existing = await this.repo.findByUserAndCourse(studentId, courseId);
    if (existing) {
      throw new ConflictException(
        'Student is already enrolled in this course.',
      );
    }

    const enrollment = await this.repo.create({
      userId: studentId,
      courseId,
      status: EnrollmentStatus.PENDING,
      enrolledById: adminId,
    });

    return mapEnrollment(enrollment);
  }

  /**
   * ADMIN / SUPER_ADMIN: activate an enrollment.
   */
  async activate(enrollmentId: string): Promise<EnrollmentResponse> {
    const enrollment = await this.repo.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    if (enrollment.status === EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Enrollment is already active.');
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot activate a cancelled enrollment.');
    }

    const updated = await this.repo.updateStatus(
      enrollmentId,
      EnrollmentStatus.ACTIVE,
    );

    // Fire-and-forget: notification failure must not break enrollment
    void this.fireEnrollmentActivatedNotification(
      updated.userId,
      updated.courseId,
    );

    return mapEnrollment(updated);
  }

  private async fireEnrollmentActivatedNotification(
    userId: string,
    courseId: string,
  ): Promise<void> {
    try {
      const [user, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
        this.prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true, title: true },
        }),
      ]);

      if (user && course) {
        await this.notificationService.onEnrollmentActivated({
          student: user,
          course,
        });
      }
    } catch (err) {
      this.logger.error(
        `[fireEnrollmentActivatedNotification] ${(err as Error).message}`,
      );
    }
  }

  /**
   * STUDENT: get own active enrollments.
   */
  async getMyEnrollments(userId: string): Promise<MyEnrollmentResponse[]> {
    const enrollments = await this.repo.findActiveByUser(userId);
    return enrollments.map((e) => ({
      courseId: e.courseId,
      enrolledAt: e.createdAt,
    }));
  }

  /**
   * ADMIN / SUPER_ADMIN: cancel an enrollment.
   */
  async cancel(enrollmentId: string): Promise<EnrollmentResponse> {
    const enrollment = await this.repo.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException('Enrollment is already cancelled.');
    }

    const updated = await this.repo.updateStatus(
      enrollmentId,
      EnrollmentStatus.CANCELLED,
    );

    return mapEnrollment(updated);
  }
}
