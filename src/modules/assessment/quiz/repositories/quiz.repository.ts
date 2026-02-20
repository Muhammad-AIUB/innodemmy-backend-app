import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type QuizWithOwnership = {
  id: string;
  lessonId: string;
  title: string;
  lesson: {
    module: {
      courseId: string;
      course: { createdById: string };
    };
  };
};

export type QuizResult = {
  id: string;
  lessonId: string;
  title: string;
};

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithOwnership(id: string): Promise<QuizWithOwnership | null> {
    return this.prisma.quiz.findFirst({
      where: { id },
      select: {
        id: true,
        lessonId: true,
        title: true,
        lesson: {
          select: {
            module: {
              select: {
                courseId: true,
                course: { select: { createdById: true } },
              },
            },
          },
        },
      },
    }) as Promise<QuizWithOwnership | null>;
  }

  async findByLessonId(lessonId: string): Promise<QuizResult | null> {
    return this.prisma.quiz.findUnique({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        title: true,
      },
    });
  }

  async update(id: string, data: Prisma.QuizUpdateInput): Promise<QuizResult> {
    return this.prisma.quiz.update({
      where: { id },
      data,
      select: {
        id: true,
        lessonId: true,
        title: true,
      },
    });
  }
}
