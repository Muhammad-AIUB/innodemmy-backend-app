import { Injectable } from '@nestjs/common';
import { Enrollment, EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EnrollmentUncheckedCreateInput,
  ): Promise<Enrollment> {
    return this.prisma.enrollment.create({ data });
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
  }

  async findById(id: string): Promise<Enrollment | null> {
    return this.prisma.enrollment.findFirst({
      where: { id },
    });
  }

  async findActiveEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      // Leverages the @@unique([userId, courseId]) index for an efficient lookup
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        enrolledById: true,
        createdAt: true,
      },
    }) as Promise<Enrollment | null>;
  }

  async updateStatus(
    id: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    return this.prisma.enrollment.update({
      where: { id },
      data: { status },
    });
  }

  async findAllByCourse(courseId: string): Promise<Enrollment[]> {
    return this.prisma.enrollment.findMany({
      where: { courseId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        enrolledById: true,
        createdAt: true,
      },
    }) as Promise<Enrollment[]>;
  }
}
