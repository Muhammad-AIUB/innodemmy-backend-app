import { Injectable } from '@nestjs/common';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class EnrollmentRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EnrollmentRequestUncheckedCreateInput,
  ): Promise<EnrollmentRequest> {
    return this.prisma.enrollmentRequest.create({ data });
  }

  /**
   * Find a single request by ID, eagerly loading user & course to avoid N+1.
   */
  async findById(id: string) {
    return this.prisma.enrollmentRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * Check for existing PENDING request for a user + course combination.
   */
  async findPendingByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentRequest | null> {
    return this.prisma.enrollmentRequest.findFirst({
      where: { userId, courseId, status: EnrollmentRequestStatus.PENDING },
    });
  }

  /**
   * List all requests, optionally filtered by status.
   * Eagerly includes user & course to prevent N+1 queries.
   */
  async findAllByStatus(status?: EnrollmentRequestStatus) {
    return this.prisma.enrollmentRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update the status (and optional admin note) of a request.
   */
  async updateStatus(
    id: string,
    status: EnrollmentRequestStatus,
    adminNote?: string,
  ) {
    return this.prisma.enrollmentRequest.update({
      where: { id },
      data: { status, adminNote },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }
}
