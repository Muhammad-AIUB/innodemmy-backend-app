import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(): Promise<Category[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.repo.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.repo.findBySlug(slug);
    if (existing) {
      throw new ConflictException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    return this.repo.create({
      name: dto.name,
      slug,
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    const updateData: { name?: string; slug?: string } = {};

    if (dto.name && dto.name !== category.name) {
      const slug = this.generateSlug(dto.name);

      // Check for duplicate slug
      const existing = await this.repo.findBySlug(slug);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Category with name "${dto.name}" already exists`,
        );
      }

      updateData.name = dto.name;
      updateData.slug = slug;
    }

    if (Object.keys(updateData).length === 0) {
      return category;
    }

    return this.repo.update(id, updateData);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete(id);
  }
}
