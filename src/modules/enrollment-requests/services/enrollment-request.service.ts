import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentRequestStatus, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { EnrollmentRequestRepository } from '../repositories/enrollment-request.repository';
import { EnrollmentRepository } from '../../enrollments/repositories/enrollment.repository';
import { CreateEnrollmentRequestDto } from '../dto/create-enrollment-request.dto';

@Injectable()
export class EnrollmentRequestService {
  constructor(
    private readonly repo: EnrollmentRequestRepository,
    private readonly prisma: PrismaService,
    private readonly enrollmentRepo: EnrollmentRepository,
  ) {}

  // ─── 1. STUDENT: CREATE ENROLLMENT REQUEST ─────────────────────────────

  async createRequest(userId: string, dto: CreateEnrollmentRequestDto) {
    const { courseId, paymentMethod, transactionId, screenshotUrl } = dto;

    // 1. Validate course exists and is published
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, status: 'PUBLISHED' },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published.');
    }

    // 2. Check user is not already actively enrolled
    const activeEnrollment = await this.enrollmentRepo.findActiveEnrollment(
      userId,
      courseId,
    );
    if (activeEnrollment) {
      throw new ConflictException(
        'You are already enrolled and active in this course.',
      );
    }

    // 3. Prevent duplicate pending requests
    const existingPending = await this.repo.findPendingByUserAndCourse(
      userId,
      courseId,
    );
    if (existingPending) {
      throw new ConflictException(
        'You already have a pending enrollment request for this course.',
      );
    }

    // 4. Create the enrollment request
    return this.repo.create({
      userId,
      courseId,
      paymentMethod,
      transactionId,
      screenshotUrl,
      status: EnrollmentRequestStatus.PENDING,
    });
  }

  // ─── 2. ADMIN: LIST ENROLLMENT REQUESTS ─────────────────────────────────

  async findAll(status?: EnrollmentRequestStatus) {
    return this.repo.findAllByStatus(status);
  }

  // ─── 3. ADMIN: APPROVE ──────────────────────────────────────────────────

  async approve(id: string, adminNote?: string) {
    const request = await this.repo.findById(id);

    if (!request) {
      throw new NotFoundException('Enrollment request not found.');
    }

    if (request.status !== EnrollmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been ${request.status.toLowerCase()}.`,
      );
    }

    // Transaction: mark approved + create/activate enrollment (idempotent)
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Mark request as APPROVED
      const updatedRequest = await tx.enrollmentRequest.update({
        where: { id },
        data: {
          status: EnrollmentRequestStatus.APPROVED,
          adminNote: adminNote ?? null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      });

      // 2. Upsert enrollment to ACTIVE (idempotent)
      const existingEnrollment = await this.enrollmentRepo.findByUserAndCourse(
        request.userId,
        request.courseId,
      );

      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            userId: request.userId,
            courseId: request.courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        });
      } else if (existingEnrollment.status !== EnrollmentStatus.ACTIVE) {
        await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { status: EnrollmentStatus.ACTIVE },
        });
      }

      return updatedRequest;
    });

    return updated;
  }

  // ─── 4. ADMIN: REJECT ───────────────────────────────────────────────────

  async reject(id: string, adminNote?: string) {
    const request = await this.repo.findById(id);

    if (!request) {
      throw new NotFoundException('Enrollment request not found.');
    }

    if (request.status !== EnrollmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been ${request.status.toLowerCase()}.`,
      );
    }

    return this.repo.updateStatus(
      id,
      EnrollmentRequestStatus.REJECTED,
      adminNote,
    );
  }
}
