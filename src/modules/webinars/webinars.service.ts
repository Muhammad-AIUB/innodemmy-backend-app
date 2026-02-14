import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Webinar } from '@prisma/client';
import { WebinarsRepository } from './webinars.repository';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';
import { generateSlug } from '../../common/utils/slugify';
import { isUUID } from 'class-validator';

@Injectable()
export class WebinarsService {
  constructor(private readonly repo: WebinarsRepository) {}

  /* =========================
     CREATE WEBINAR
  ========================== */
  async create(dto: CreateWebinarDto) {
    const slug = await this.generateUniqueSlug(dto.title);

    return this.repo.create({
      ...dto,
      slug,
    });
  }

  /* =========================
     GET ALL (Pagination Ready)
  ========================== */
  async findAll(skip = 0, take = 10) {
    return this.repo.findAll({ skip, take });
  }

  /* =========================
     FIND ONE (By ID or Slug)
  ========================== */
  async findOne(identifier: string) {
    let webinar: Webinar | null = null;

    if (isUUID(identifier)) {
      webinar = await this.repo.findOneById(identifier);
    } else {
      webinar = await this.repo.findOneBySlug(identifier);
    }

    if (!webinar || webinar.isDeleted) {
      throw new NotFoundException('Webinar not found');
    }

    return webinar;
  }

  /* =========================
     UPDATE
  ========================== */
  async update(id: string, dto: UpdateWebinarDto) {
    await this.ensureExists(id);

    const updateData: Prisma.WebinarUpdateInput = { ...dto };

    if (dto.title) {
      updateData.slug = await this.generateUniqueSlug(dto.title);
    }

    return this.repo.update(id, updateData);
  }

  /* =========================
     SOFT DELETE
  ========================== */
  async remove(id: string) {
    await this.ensureExists(id);

    return this.repo.update(id, {
      isDeleted: true,
      status: 'DRAFT',
    });
  }

  /* =========================
     PRIVATE HELPERS
  ========================== */

  private async ensureExists(id: string) {
    const webinar = await this.repo.findOneById(id);

    if (!webinar || webinar.isDeleted) {
      throw new NotFoundException('Webinar not found');
    }

    return webinar;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.repo.findOneBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }
}
