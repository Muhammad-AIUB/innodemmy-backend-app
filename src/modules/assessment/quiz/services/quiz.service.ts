import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';
import {
  QuizRepository,
  QuizResult,
  QuizWithOwnership,
} from '../repositories/quiz.repository';
import { UpdateQuizDto } from '../dto/update-quiz.dto';

@Injectable()
export class QuizService {
  constructor(private readonly repo: QuizRepository) {}

  private validateOwnership(quiz: QuizWithOwnership, user: JwtPayload): void {
    if (
      user.role === UserRole.ADMIN &&
      quiz.lesson.module.course.createdById !== user.sub
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this quiz.',
      );
    }
  }

  async update(
    id: string,
    dto: UpdateQuizDto,
    user: JwtPayload,
  ): Promise<QuizResult> {
    const quiz = await this.repo.findByIdWithOwnership(id);

    if (!quiz) {
      throw new NotFoundException('Quiz not found.');
    }

    this.validateOwnership(quiz, user);

    return this.repo.update(id, { title: dto.title });
  }

  async findByLessonId(lessonId: string): Promise<QuizResult> {
    const quiz = await this.repo.findByLessonId(lessonId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found for this lesson.');
    }

    return quiz;
  }
}
