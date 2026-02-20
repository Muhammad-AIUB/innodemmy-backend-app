import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';
import {
  AssignmentRepository,
  AssignmentResult,
  AssignmentWithOwnership,
  SubmissionResult,
} from '../repositories/assignment.repository';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { NotificationService } from '../../../notification/services/notification.service';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly repo: AssignmentRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private validateOwnership(
    assignment: AssignmentWithOwnership,
    user: JwtPayload,
  ): void {
    if (
      user.role === UserRole.ADMIN &&
      assignment.lesson.module.course.createdById !== user.sub
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this assignment.',
      );
    }
  }

  async update(
    id: string,
    dto: UpdateAssignmentDto,
    user: JwtPayload,
  ): Promise<AssignmentResult> {
    const assignment = await this.repo.findByIdWithOwnership(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    this.validateOwnership(assignment, user);

    return this.repo.update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
    });
  }

  async submit(assignmentId: string, dto: SubmitAssignmentDto, userId: string) {
    const assignment = await this.repo.findByIdWithOwnership(assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    try {
      const submission = await this.repo.createSubmission({
        assignmentId,
        userId,
        fileUrl: dto.fileUrl,
      });

      // Fire-and-forget: notification failure must not break submission flow
      void this.fireAssignmentSubmittedNotification(
        userId,
        assignmentId,
        assignment,
      );

      return submission;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'You have already submitted this assignment.',
        );
      }
      throw error;
    }
  }

  async getSubmissions(
    assignmentId: string,
    user: JwtPayload,
  ): Promise<SubmissionResult[]> {
    const assignment = await this.repo.findByIdWithOwnership(assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    this.validateOwnership(assignment, user);

    return this.repo.findSubmissionsByAssignmentId(assignmentId);
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────

  private async fireAssignmentSubmittedNotification(
    studentId: string,
    assignmentId: string,
    assignment: AssignmentWithOwnership,
  ): Promise<void> {
    try {
      const adminId = assignment.lesson.module.course.createdById;

      const [student, admin, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: studentId },
          select: { id: true, name: true, email: true },
        }),
        this.prisma.user.findUnique({
          where: { id: adminId },
          select: { id: true, name: true, email: true },
        }),
        this.prisma.course.findFirst({
          where: {
            modules: {
              some: { lessons: { some: { assignment: { id: assignmentId } } } },
            },
          },
          select: { title: true },
        }),
      ]);

      if (student && admin) {
        await this.notificationService.onAssignmentSubmitted({
          student,
          admin,
          assignment: { id: assignment.id, title: assignment.title },
          course: { title: course?.title ?? 'Unknown Course' },
        });
      }
    } catch (err) {
      this.logger.error(
        `[fireAssignmentSubmittedNotification] ${(err as Error).message}`,
      );
    }
  }
}
