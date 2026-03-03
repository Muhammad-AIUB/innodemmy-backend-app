import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, isDeleted: false },
    });
  }

  async create(data: { name: string; slug: string }): Promise<Category> {
    return this.prisma.category.create({
      data,
    });
  }

  async update(
    id: string,
    data: { name?: string; slug?: string },
  ): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async count(): Promise<number> {
    return this.prisma.category.count({
      where: { isDeleted: false },
    });
  }
}
