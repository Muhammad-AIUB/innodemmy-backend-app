import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { EnrollmentRepository } from '../../enrollments/repositories/enrollment.repository';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly repo: PaymentRepository,
    private readonly prisma: PrismaService,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── 1. GET PAYMENT LINK ─────────────────────────────────────────────────

  async getPaymentLink(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        price: true,
        discountPrice: true,
        bkashNumber: true,
        nagadNumber: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published.');
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      amount: course.discountPrice ?? course.price,
      bkashNumber: course.bkashNumber,
      nagadNumber: course.nagadNumber,
    };
  }

  // ─── 2. UPLOAD PAYMENT SLIP ───────────────────────────────────────────────

  async uploadSlip(userId: string, courseId: string, slipUrl: string) {
    // Verify course exists and is published
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, status: 'PUBLISHED' },
      select: { id: true, title: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published.');
    }

    // Check for existing pending payment
    const existingPayment = await this.repo.findByUserAndCourse(
      userId,
      courseId,
    );
    if (existingPayment) {
      throw new ConflictException(
        'You already have a pending payment for this course.',
      );
    }

    // Check if already actively enrolled
    const activeEnrollment = await this.enrollmentRepo.findActiveEnrollment(
      userId,
      courseId,
    );
    if (activeEnrollment) {
      throw new ConflictException(
        'You are already enrolled and active in this course.',
      );
    }

    // Create payment record and PENDING enrollment in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          courseId,
          slipUrl,
          status: PaymentStatus.PENDING,
        },
      });

      // Find or create enrollment with PENDING status
      const existingEnrollment = await this.enrollmentRepo.findByUserAndCourse(
        userId,
        courseId,
      );

      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            userId,
            courseId,
            status: EnrollmentStatus.PENDING,
          },
        });
      } else if (existingEnrollment.status === EnrollmentStatus.CANCELLED) {
        await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { status: EnrollmentStatus.PENDING },
        });
      }

      return payment;
    });

    return result;
  }

  // ─── 3. GET PENDING PAYMENTS (ADMIN) ──────────────────────────────────────

  async getPendingPayments() {
    return this.repo.findAllPending();
  }

  // ─── 4. VERIFY PAYMENT (ADMIN) ───────────────────────────────────────────

  async verifyPayment(paymentId: string, adminId: string) {
    const payment = await this.repo.findById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment has already been ${payment.status.toLowerCase()}.`,
      );
    }

    // Update payment status
    const updated = await this.repo.updateStatus(
      paymentId,
      PaymentStatus.VERIFIED,
      adminId,
    );

    // Activate enrollment
    const enrollment = await this.enrollmentRepo.findByUserAndCourse(
      payment.userId,
      payment.courseId,
    );

    if (enrollment) {
      await this.enrollmentRepo.updateStatus(
        enrollment.id,
        EnrollmentStatus.ACTIVE,
      );
    }

    // Fire-and-forget: notification + email
    void this.firePaymentVerifiedNotification(payment.userId, payment.courseId);

    return updated;
  }

  // ─── 5. REJECT PAYMENT (ADMIN) ───────────────────────────────────────────

  async rejectPayment(paymentId: string, adminId: string) {
    const payment = await this.repo.findById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment has already been ${payment.status.toLowerCase()}.`,
      );
    }

    // Update payment status
    const updated = await this.repo.updateStatus(
      paymentId,
      PaymentStatus.REJECTED,
      adminId,
    );

    // Cancel enrollment
    const enrollment = await this.enrollmentRepo.findByUserAndCourse(
      payment.userId,
      payment.courseId,
    );

    if (enrollment) {
      await this.enrollmentRepo.updateStatus(
        enrollment.id,
        EnrollmentStatus.CANCELLED,
      );
    }

    // Fire-and-forget: notification + email
    void this.firePaymentRejectedNotification(payment.userId, payment.courseId);

    return updated;
  }

  // ─── PRIVATE: NOTIFICATION HELPERS ────────────────────────────────────────

  private async firePaymentVerifiedNotification(
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
        `[firePaymentVerifiedNotification] ${(err as Error).message}`,
      );
    }
  }

  private async firePaymentRejectedNotification(
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
        await this.notificationService.onPaymentRejected({
          student: user,
          course,
        });
      }
    } catch (err) {
      this.logger.error(
        `[firePaymentRejectedNotification] ${(err as Error).message}`,
      );
    }
  }
}
