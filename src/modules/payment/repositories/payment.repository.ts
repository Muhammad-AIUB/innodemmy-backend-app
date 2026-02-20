import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PaymentUncheckedCreateInput): Promise<Payment> {
    return this.prisma.payment.create({ data });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: { userId, courseId, status: PaymentStatus.PENDING },
    });
  }

  async findAllPending(): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    reviewedById: string,
    adminNote?: string,
  ): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: { status, reviewedById, adminNote },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }
}
