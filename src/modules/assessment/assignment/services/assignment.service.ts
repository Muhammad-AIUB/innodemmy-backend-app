import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';
import {
  AssignmentRepository,
  AssignmentResult,
  AssignmentWithOwnership,
  SubmissionResult,
} from '../repositories/assignment.repository';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';

@Injectable()
export class AssignmentService {
  constructor(private readonly repo: AssignmentRepository) {}

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

  async submit(
    assignmentId: string,
    dto: SubmitAssignmentDto,
    userId: string,
  ) {
    const assignment = await this.repo.findByIdWithOwnership(assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    try {
      return await this.repo.createSubmission({
        assignmentId,
        userId,
        fileUrl: dto.fileUrl,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 'P2002'
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
}
