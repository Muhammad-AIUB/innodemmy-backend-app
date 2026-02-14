import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { $Enums } from '@prisma/client';
import type { Webinar } from '@prisma/client';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';

@Injectable()
export class WebinarsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUniqueSlug(base: string) {
    let slug = base;
    let count = 0;
    while (await this.prisma.webinar.findUnique({ where: { slug } })) {
      count += 1;
      slug = `${base}-${count}`;
    }
    return slug;
  }

  private toPrismaCreatePayload(dto: CreateWebinarDto) {
    return {
      title: dto.title,
      description: dto.description,
      date: new Date(dto.date),
      duration: dto.duration,
      sectionOneTitle: dto.sectionOneTitle ?? null,
      sectionOnePoints: dto.sectionOnePoints ?? [],
      sectionTwoTitle: dto.sectionTwoTitle ?? null,
      sectionTwoPoints: dto.sectionTwoPoints ?? [],
      status: (dto.status ?? 'DRAFT') as $Enums.WebinarStatus,
      slug: '',
    };
  }

  private toPrismaUpdatePayload(dto: UpdateWebinarDto) {
    const payload: Record<string, unknown> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.date !== undefined) payload.date = new Date(dto.date);
    if (dto.duration !== undefined) payload.duration = dto.duration;
    if (dto.sectionOneTitle !== undefined)
      payload.sectionOneTitle = dto.sectionOneTitle;
    if (dto.sectionOnePoints !== undefined)
      payload.sectionOnePoints = dto.sectionOnePoints;
    if (dto.sectionTwoTitle !== undefined)
      payload.sectionTwoTitle = dto.sectionTwoTitle;
    if (dto.sectionTwoPoints !== undefined)
      payload.sectionTwoPoints = dto.sectionTwoPoints;
    if (dto.status !== undefined) payload.status = dto.status;
    return payload;
  }

  async create(dto: CreateWebinarDto): Promise<Webinar> {
    const payload = this.toPrismaCreatePayload(dto);
    const baseSlug = slugify(payload.title || 'webinar');
    const slug = await this.ensureUniqueSlug(baseSlug);
    return this.prisma.webinar.create({ data: { ...payload, slug } });
  }

  async findAll(params?: { skip?: number; take?: number }): Promise<Webinar[]> {
    const { skip = 0, take = 50 } = params || {};
    return this.prisma.webinar.findMany({
      skip,
      take,
      orderBy: { date: 'desc' },
    });
  }

  async findOneById(id: string): Promise<Webinar | null> {
    return this.prisma.webinar.findUnique({ where: { id } });
  }

  async findOneBySlug(slug: string): Promise<Webinar | null> {
    return this.prisma.webinar.findUnique({ where: { slug } });
  }

  async update(id: string, dto: UpdateWebinarDto): Promise<Webinar> {
    const payload = this.toPrismaUpdatePayload(dto);
    if (dto.title) {
      const baseSlug = slugify(dto.title);
      payload.slug = await this.ensureUniqueSlug(baseSlug);
    }
    return this.prisma.webinar.update({ where: { id }, data: payload });
  }

  async remove(id: string): Promise<Webinar> {
    return this.prisma.webinar.delete({ where: { id } });
  }
}
