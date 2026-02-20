import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Enrollment, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { EnrollmentRepository } from '../repositories/enrollment.repository';

export type EnrollmentResponse = {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledById: string | null;
  createdAt: Date;
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
  constructor(
    private readonly repo: EnrollmentRepository,
    private readonly prisma: PrismaService,
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

    return mapEnrollment(updated);
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
