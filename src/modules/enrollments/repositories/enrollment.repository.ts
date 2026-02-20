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

  /**
   * O(1) point lookup using the @@unique([userId, courseId]) index.
   * Replaced findFirst (sequential scan) with findUnique (index seek).
   */
  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
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
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        enrolledById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      return null;
    }

    return enrollment as Enrollment;
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
        updatedAt: true,
      },
    }) as Promise<Enrollment[]>;
  }
}
