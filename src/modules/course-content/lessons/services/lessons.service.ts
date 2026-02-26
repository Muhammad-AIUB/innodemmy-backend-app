import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LessonType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  LessonDetailResult,
  LessonsRepository,
  LessonResult,
} from '../repositories/lessons.repository';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';

@Injectable()
export class LessonsService {
  constructor(
    private readonly repo: LessonsRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Verify the module exists. Returns the module with ownership info.
   */
  private async validateModuleOwnership(
    moduleId: string,
    user: JwtPayload,
  ): Promise<{ courseId: string }> {
    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
      select: {
        id: true,
        courseId: true,
        course: { select: { createdById: true } },
      },
    });

    if (!mod) {
      throw new NotFoundException('Module not found.');
    }

    if (user.role === UserRole.ADMIN && mod.course.createdById !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to modify this module.',
      );
    }

    return { courseId: mod.courseId };
  }

  /**
   * Verify the lesson exists and the caller has ownership rights.
   * Returns the full lesson with ownership + type info.
   */
  private async validateLessonOwnership(lessonId: string, user: JwtPayload) {
    const lesson = await this.repo.findByIdWithOwnership(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    if (
      user.role === UserRole.ADMIN &&
      lesson.module.course.createdById !== user.sub
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this lesson.',
      );
    }

    return lesson;
  }

  // ─── Public Methods ───────────────────────────────────────────────────────────

  /**
   * Create a lesson inside a module.
   * - VIDEO  → stores videoUrl
   * - QUIZ   → creates a linked Quiz record (atomic transaction)
   * - ASSIGNMENT → creates a linked Assignment record (atomic transaction)
   */
  async create(
    moduleId: string,
    dto: CreateLessonDto,
    user: JwtPayload,
  ): Promise<LessonResult> {
    await this.validateModuleOwnership(moduleId, user);

    // DTO-level validation for required side fields
    if (dto.type === LessonType.VIDEO && !dto.videoUrl) {
      throw new BadRequestException('videoUrl is required for VIDEO lessons.');
    }
    if (dto.type === LessonType.QUIZ && !dto.quizTitle) {
      throw new BadRequestException('quizTitle is required for QUIZ lessons.');
    }
    if (
      dto.type === LessonType.ASSIGNMENT &&
      (!dto.assignmentTitle || !dto.assignmentDescription)
    ) {
      throw new BadRequestException(
        'assignmentTitle and assignmentDescription are required for ASSIGNMENT lessons.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 0. Get next order value
      const maxOrderResult = await tx.lesson.aggregate({
        where: { moduleId },
        _max: { order: true },
      });
      const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

      // 1. Create the core lesson record
      const lesson = await tx.lesson.create({
        data: {
          moduleId,
          title: dto.title,
          type: dto.type,
          order: nextOrder,
          ...(dto.type === LessonType.VIDEO ? { videoUrl: dto.videoUrl } : {}),
          ...(dto.content !== undefined
            ? { content: dto.content as Prisma.InputJsonValue }
            : {}),
        },
        select: {
          id: true,
          title: true,
          order: true,
          type: true,
          videoUrl: true,
          moduleId: true,
          content: true,
        },
      });

      // 2. Create side record based on type
      if (dto.type === LessonType.QUIZ) {
        await tx.quiz.create({
          data: { lessonId: lesson.id, title: dto.quizTitle! },
        });
      }

      if (dto.type === LessonType.ASSIGNMENT) {
        await tx.assignment.create({
          data: {
            lessonId: lesson.id,
            title: dto.assignmentTitle!,
            description: dto.assignmentDescription!,
          },
        });
      }

      return lesson;
    });
  }

  /**
   * Update lesson metadata (title, type, videoUrl, content).
   * Does NOT mutate Quiz / Assignment side-records.
   */
  async update(
    lessonId: string,
    dto: UpdateLessonDto,
    user: JwtPayload,
  ): Promise<LessonResult> {
    await this.validateLessonOwnership(lessonId, user);

    return this.repo.update(lessonId, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
      ...(dto.content !== undefined
        ? { content: dto.content as Prisma.InputJsonValue }
        : {}),
    });
  }

  /**
   * Find a single lesson with ownership checks.
   */
  async findById(
    lessonId: string,
    user: JwtPayload,
  ): Promise<LessonDetailResult> {
    const lesson = await this.validateLessonOwnership(lessonId, user);

    return {
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      type: lesson.type,
      videoUrl: lesson.videoUrl,
      moduleId: lesson.moduleId,
      content: lesson.content,
      courseId: lesson.module.courseId,
    };
  }

  /**
   * Hard-delete a lesson and its side-records (Quiz / Assignment + Submissions)
   * inside a single transaction.
   */
  async delete(lessonId: string, user: JwtPayload): Promise<void> {
    const lesson = await this.validateLessonOwnership(lessonId, user);

    await this.prisma.$transaction(async (tx) => {
      if (lesson.type === LessonType.ASSIGNMENT) {
        // Delete submissions before assignment (FK constraint)
        const assignment = await tx.assignment.findFirst({
          where: { lessonId },
          select: { id: true },
        });

        if (assignment) {
          await tx.assignmentSubmission.deleteMany({
            where: { assignmentId: assignment.id },
          });
          await tx.assignment.delete({ where: { id: assignment.id } });
        }
      }

      if (lesson.type === LessonType.QUIZ) {
        await tx.quiz.deleteMany({ where: { lessonId } });
      }

      await tx.lesson.delete({ where: { id: lessonId } });
    });
  }

  /**
   * Reorder a lesson by swapping its order with the adjacent lesson.
   * Runs in a transaction to maintain unique ordering.
   */
  async reorder(
    lessonId: string,
    direction: 'up' | 'down',
    user: JwtPayload,
  ): Promise<void> {
    const lesson = await this.validateLessonOwnership(lessonId, user);

    await this.prisma.$transaction(async (tx) => {
      // Get the current lesson
      const current = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, order: true, moduleId: true },
      });

      if (!current) {
        throw new NotFoundException('Lesson not found.');
      }

      // Find the adjacent lesson to swap with
      const adjacent = await tx.lesson.findFirst({
        where: {
          moduleId: current.moduleId,
          order:
            direction === 'up' ? { lt: current.order } : { gt: current.order },
        },
        orderBy: {
          order: direction === 'up' ? 'desc' : 'asc',
        },
        select: { id: true, order: true },
      });

      if (!adjacent) {
        throw new BadRequestException(
          `Cannot move lesson ${direction}. It is already at the ${direction === 'up' ? 'top' : 'bottom'}.`,
        );
      }

      // Swap orders using a temporary value to avoid unique constraint violation
      const tempOrder = -1;
      await tx.lesson.update({
        where: { id: current.id },
        data: { order: tempOrder },
      });
      await tx.lesson.update({
        where: { id: adjacent.id },
        data: { order: current.order },
      });
      await tx.lesson.update({
        where: { id: current.id },
        data: { order: adjacent.order },
      });
    });
  }
}
