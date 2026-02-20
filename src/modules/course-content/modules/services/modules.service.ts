import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  ModuleWithLessons,
  ModulesRepository,
} from '../repositories/modules.repository';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';

export type ModuleResponse = {
  id: string;
  title: string;
  courseId: string;
};

@Injectable()
export class ModulesService {
  constructor(
    private readonly repo: ModulesRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Verifies the course exists and, for ADMIN, enforces ownership.
   * SUPER_ADMIN bypasses ownership check.
   */
  private async validateCourseOwnership(
    courseId: string,
    user: JwtPayload,
  ): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true, createdById: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (user.role === UserRole.ADMIN && course.createdById !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to modify this course.',
      );
    }
  }

  /**
   * Verifies the module exists and, for ADMIN, enforces ownership via the course.
   */
  private async validateModuleOwnership(
    moduleId: string,
    user: JwtPayload,
  ): Promise<{ id: string; courseId: string }> {
    const mod = await this.repo.findById(moduleId);

    if (!mod) {
      throw new NotFoundException('Module not found.');
    }

    if (user.role === UserRole.ADMIN && mod.course.createdById !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to modify this module.',
      );
    }

    return { id: mod.id, courseId: mod.courseId };
  }

  // ─── Public Methods ───────────────────────────────────────────────────────────

  async create(
    courseId: string,
    dto: CreateModuleDto,
    user: JwtPayload,
  ): Promise<ModuleResponse> {
    await this.validateCourseOwnership(courseId, user);

    const mod = await this.repo.create({ courseId, title: dto.title });

    return { id: mod.id, title: mod.title, courseId: mod.courseId };
  }

  async update(
    moduleId: string,
    dto: UpdateModuleDto,
    user: JwtPayload,
  ): Promise<ModuleResponse> {
    await this.validateModuleOwnership(moduleId, user);

    const updated = await this.repo.update(moduleId, { title: dto.title });

    return { id: updated.id, title: updated.title, courseId: updated.courseId };
  }

  /**
   * Hard-delete a module and all its lessons (including Quiz/Assignment
   * side-records and AssignmentSubmissions) inside a single transaction.
   */
  async delete(moduleId: string, user: JwtPayload): Promise<void> {
    await this.validateModuleOwnership(moduleId, user);

    await this.prisma.$transaction(async (tx) => {
      // 1. Collect lesson IDs in this module
      const lessons = await tx.lesson.findMany({
        where: { moduleId },
        select: { id: true },
      });
      const lessonIds = lessons.map((l) => l.id);

      if (lessonIds.length > 0) {
        // 2. Delete assignment submissions first (FK constraint)
        const assignments = await tx.assignment.findMany({
          where: { lessonId: { in: lessonIds } },
          select: { id: true },
        });
        const assignmentIds = assignments.map((a) => a.id);

        if (assignmentIds.length > 0) {
          await tx.assignmentSubmission.deleteMany({
            where: { assignmentId: { in: assignmentIds } },
          });
          await tx.assignment.deleteMany({
            where: { id: { in: assignmentIds } },
          });
        }

        // 3. Delete quizzes
        await tx.quiz.deleteMany({ where: { lessonId: { in: lessonIds } } });

        // 4. Delete lessons
        await tx.lesson.deleteMany({ where: { id: { in: lessonIds } } });
      }

      // 5. Delete the module
      await tx.courseModule.delete({ where: { id: moduleId } });
    });
  }

  /**
   * Returns all modules for a course with their nested lessons.
   * Used by the student-facing GET route (protected by EnrollmentGuard).
   */
  async findByCourseWithLessons(
    courseId: string,
  ): Promise<ModuleWithLessons[]> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.repo.findByCourseIdWithLessons(courseId);
  }
}
