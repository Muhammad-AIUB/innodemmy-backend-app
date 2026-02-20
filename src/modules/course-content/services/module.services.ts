import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseModule, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type ModuleResponse = {
  id: string;
  title: string;
  courseId: string;
};

@Injectable()
export class ModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CourseModuleUncheckedCreateInput,
  ): Promise<CourseModule> {
    return this.prisma.courseModule.create({ data });
  }

  async findById(id: string): Promise<CourseModule | null> {
    return this.prisma.courseModule.findFirst({ where: { id } });
  }

  async findByCourseId(courseId: string): Promise<ModuleResponse[]> {
    return this.prisma.courseModule.findMany({
      where: { courseId },
      select: { id: true, title: true, courseId: true },
      orderBy: { id: 'asc' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.courseModule.delete({ where: { id } });
  }
}

@Injectable()
export class ModuleService {
  constructor(
    private readonly moduleRepo: ModuleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(courseId: string, title: string): Promise<ModuleResponse> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const mod = await this.moduleRepo.create({ courseId, title });
    return { id: mod.id, title: mod.title, courseId: mod.courseId };
  }

  async findByCourse(courseId: string): Promise<ModuleResponse[]> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.moduleRepo.findByCourseId(courseId);
  }

  async remove(moduleId: string): Promise<void> {
    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod) {
      throw new NotFoundException('Module not found.');
    }
    await this.moduleRepo.delete(moduleId);
  }
}
