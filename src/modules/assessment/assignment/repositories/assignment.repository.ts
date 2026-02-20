import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type AssignmentWithOwnership = {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  lesson: {
    module: {
      courseId: string;
      course: { createdById: string };
    };
  };
};

export type AssignmentResult = {
  id: string;
  lessonId: string;
  title: string;
  description: string;
};

export type SubmissionResult = {
  id: string;
  assignmentId: string;
  userId: string;
  fileUrl: string;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};

@Injectable()
export class AssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithOwnership(
    id: string,
  ): Promise<AssignmentWithOwnership | null> {
    return this.prisma.assignment.findFirst({
      where: { id },
      select: {
        id: true,
        lessonId: true,
        title: true,
        description: true,
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
    }) as Promise<AssignmentWithOwnership | null>;
  }

  async update(
    id: string,
    data: Prisma.AssignmentUpdateInput,
  ): Promise<AssignmentResult> {
    return this.prisma.assignment.update({
      where: { id },
      data,
      select: {
        id: true,
        lessonId: true,
        title: true,
        description: true,
      },
    });
  }

  async createSubmission(data: {
    assignmentId: string;
    userId: string;
    fileUrl: string;
  }) {
    return this.prisma.assignmentSubmission.create({
      data,
      select: {
        id: true,
        assignmentId: true,
        userId: true,
        fileUrl: true,
        createdAt: true,
      },
    });
  }

  async findSubmissionsByAssignmentId(
    assignmentId: string,
  ): Promise<SubmissionResult[]> {
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      select: {
        id: true,
        assignmentId: true,
        userId: true,
        fileUrl: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }) as Promise<SubmissionResult[]>;
  }
}
