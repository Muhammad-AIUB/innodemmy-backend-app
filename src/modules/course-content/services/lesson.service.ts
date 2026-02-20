import { Injectable, NotFoundException } from '@nestjs/common';
import { LessonType } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LessonRepository, LessonWithDetails } from './lesson.repositories';

export type LessonResponse = {
  id: string;
  title: string;
  type: LessonType;
  videoUrl: string | null;
  moduleId: string;
};

function mapLesson(lesson: LessonWithDetails): LessonResponse {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    videoUrl: lesson.videoUrl,
    moduleId: lesson.moduleId,
  };
}

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    moduleId: string,
    title: string,
    type: LessonType,
    videoUrl?: string,
  ): Promise<LessonResponse> {
    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
      select: { id: true },
    });

    if (!mod) {
      throw new NotFoundException('Module not found.');
    }

    const lesson = await this.lessonRepo.create({
      moduleId,
      title,
      type,
      ...(videoUrl ? { videoUrl } : {}),
    });

    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      videoUrl: lesson.videoUrl ?? null,
      moduleId: lesson.moduleId,
    };
  }

  async findByCourse(courseId: string): Promise<LessonResponse[]> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const lessons = await this.lessonRepo.findByCourseId(courseId);
    return lessons.map(mapLesson);
  }

  async findById(lessonId: string): Promise<LessonResponse> {
    const lesson = await this.lessonRepo.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      videoUrl: lesson.videoUrl ?? null,
      moduleId: lesson.moduleId,
    };
  }

  async remove(lessonId: string): Promise<void> {
    const lesson = await this.lessonRepo.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    await this.lessonRepo.delete(lessonId);
  }
}
