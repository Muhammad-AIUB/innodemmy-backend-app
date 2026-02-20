import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Notification } from '@prisma/client';
import { MailService, EmailTemplate } from '../../../shared/mail/mail.service';
import { NotificationRepository } from '../repositories/notification.repository';

// ─── PAYLOAD TYPES FOR EVENT TRIGGERS ──────────────────────────────────────

export interface EnrollmentActivatedPayload {
  student: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
}

export interface AssignmentSubmittedPayload {
  student: { id: string; name: string | null; email: string };
  admin: { id: string; name: string | null; email: string };
  assignment: { id: string; title: string };
  course: { title: string };
}

export interface CourseCompletedPayload {
  student: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
}

export interface CertificateGeneratedPayload {
  student: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
  certificateUrl?: string;
}

export interface PaymentRejectedPayload {
  student: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
}

export interface WebinarPublishedPayload {
  webinar: { id: string; title: string; date: Date };
  recipients: { id: string; name: string | null; email: string }[];
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repo: NotificationRepository,
    private readonly mail: MailService,
  ) {}

  // ─── READ ─────────────────────────────────────────────────────────────────

  async getUserNotifications(userId: string): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> {
    const [notifications, unreadCount] = await Promise.all([
      this.repo.findByUserId(userId),
      this.repo.countUnread(userId),
    ]);

    return { notifications, unreadCount };
  }

  // ─── MARK AS READ ─────────────────────────────────────────────────────────

  async markAsRead(id: string, requesterId: string): Promise<Notification> {
    const notification = await this.repo.findById(id);

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found.`);
    }

    if (notification.userId !== requesterId) {
      throw new ForbiddenException(
        'You are not allowed to update this notification.',
      );
    }

    return this.repo.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.repo.markAllAsRead(userId);
  }

  // ─── EVENT: ENROLLMENT ACTIVATED ──────────────────────────────────────────

  async onEnrollmentActivated(
    payload: EnrollmentActivatedPayload,
  ): Promise<void> {
    const { student, course } = payload;

    // 1. In-app notification
    await this.repo.create({
      userId: student.id,
      title: 'Enrollment Activated 🎉',
      message: `Your enrollment in "${course.title}" has been activated. Happy learning!`,
    });

    // 2. Email notification
    await this.mail.send({
      to: student.email,
      subject: `Your enrollment in "${course.title}" is now active`,
      template: EmailTemplate.ENROLLMENT_ACTIVATED,
      context: {
        name: student.name ?? student.email,
        courseName: course.title,
      },
    });

    this.logger.log(
      `[ENROLLMENT_ACTIVATED] student=${student.id} course=${course.id}`,
    );
  }

  // ─── EVENT: ASSIGNMENT SUBMITTED ──────────────────────────────────────────

  async onAssignmentSubmitted(
    payload: AssignmentSubmittedPayload,
  ): Promise<void> {
    const { student, admin, assignment, course } = payload;

    // 1. In-app notification for student
    await this.repo.create({
      userId: student.id,
      title: 'Assignment Submitted ✅',
      message: `Your assignment "${assignment.title}" has been received. Our instructors will review it shortly.`,
    });

    // 2. In-app notification for admin
    await this.repo.create({
      userId: admin.id,
      title: 'New Assignment Submission 📋',
      message: `${student.name ?? student.email} submitted assignment "${assignment.title}" for course "${course.title}".`,
    });

    // 3. Email to student confirming submission
    await this.mail.send({
      to: student.email,
      subject: `Assignment "${assignment.title}" submitted successfully`,
      template: EmailTemplate.ASSIGNMENT_SUBMITTED,
      context: {
        name: student.name ?? student.email,
        assignmentTitle: assignment.title,
        courseName: course.title,
      },
    });

    // 4. Email to admin notifying of new submission
    await this.mail.send({
      to: admin.email,
      subject: `[Action Required] New assignment submission from ${student.name ?? student.email}`,
      template: EmailTemplate.ASSIGNMENT_SUBMITTED_ADMIN,
      context: {
        adminName: admin.name ?? 'Admin',
        studentName: student.name ?? 'A student',
        studentEmail: student.email,
        assignmentTitle: assignment.title,
        courseName: course.title,
      },
    });

    this.logger.log(
      `[ASSIGNMENT_SUBMITTED] student=${student.id} assignment=${assignment.id}`,
    );
  }

  // ─── EVENT: COURSE COMPLETED ──────────────────────────────────────────────

  async onCourseCompleted(payload: CourseCompletedPayload): Promise<void> {
    const { student, course } = payload;

    // 1. In-app notification
    await this.repo.create({
      userId: student.id,
      title: 'Course Completed 🏆',
      message: `Congratulations! You have completed "${course.title}". Your certificate is being generated.`,
    });

    // 2. Email
    await this.mail.send({
      to: student.email,
      subject: `You've completed "${course.title}" 🎉`,
      template: EmailTemplate.COURSE_COMPLETED,
      context: {
        name: student.name ?? student.email,
        courseName: course.title,
      },
    });

    this.logger.log(
      `[COURSE_COMPLETED] student=${student.id} course=${course.id}`,
    );
  }

  // ─── EVENT: CERTIFICATE GENERATED ────────────────────────────────────────

  async onCertificateGenerated(
    payload: CertificateGeneratedPayload,
  ): Promise<void> {
    const { student, course, certificateUrl } = payload;

    // 1. In-app notification
    await this.repo.create({
      userId: student.id,
      title: 'Certificate Ready 🎓',
      message: `Your certificate for "${course.title}" is ready${certificateUrl ? '. Click to download.' : '.'}`,
    });

    // 2. Email
    await this.mail.send({
      to: student.email,
      subject: `Your certificate for "${course.title}" is ready`,
      template: EmailTemplate.CERTIFICATE_GENERATED,
      context: {
        name: student.name ?? student.email,
        courseName: course.title,
        certificateUrl: certificateUrl ?? null,
      },
    });

    this.logger.log(
      `[CERTIFICATE_GENERATED] student=${student.id} course=${course.id}`,
    );
  }

  // ─── EVENT: WEBINAR PUBLISHED ─────────────────────────────────────────────

  async onWebinarPublished(payload: WebinarPublishedPayload): Promise<void> {
    const { webinar, recipients } = payload;

    if (!recipients.length) {
      this.logger.warn(
        `[WEBINAR_PUBLISHED] No recipients for webinar=${webinar.id}`,
      );
      return;
    }

    const formattedDate = webinar.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Bulk in-app notifications
    await this.repo.createMany(
      recipients.map((r) => ({
        userId: r.id,
        title: `New Webinar: ${webinar.title} 📢`,
        message: `A new webinar "${webinar.title}" has been published! Date: ${formattedDate}`,
      })),
    );

    // 2. Individual emails (send in parallel, capped to avoid overwhelming SMTP)
    const BATCH_SIZE = 50;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map((r) =>
          this.mail.send({
            to: r.email,
            subject: `New Webinar Published: ${webinar.title}`,
            template: EmailTemplate.WEBINAR_PUBLISHED,
            context: {
              name: r.name ?? r.email,
              webinarTitle: webinar.title,
              webinarDate: formattedDate,
            },
          }),
        ),
      );
    }

    this.logger.log(
      `[WEBINAR_PUBLISHED] webinar=${webinar.id} recipients=${recipients.length}`,
    );
  }

  // ─── EVENT: PAYMENT REJECTED ────────────────────────────────────────────

  async onPaymentRejected(payload: PaymentRejectedPayload): Promise<void> {
    const { student, course } = payload;

    // 1. In-app notification
    await this.repo.create({
      userId: student.id,
      title: 'Payment Rejected',
      message: `Your payment for "${course.title}" has been rejected. Please re-submit a valid payment slip.`,
    });

    // 2. Email notification
    await this.mail.send({
      to: student.email,
      subject: `Payment rejected for "${course.title}"`,
      template: EmailTemplate.PAYMENT_REJECTED,
      context: {
        name: student.name ?? student.email,
        courseName: course.title,
      },
    });

    this.logger.log(
      `[PAYMENT_REJECTED] student=${student.id} course=${course.id}`,
    );
  }
}
