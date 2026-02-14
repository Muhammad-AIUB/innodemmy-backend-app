import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { Prisma, WebinarStatus } from '@prisma/client';

@Injectable()
export class WebinarsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUniqueSlug(base: string) {
    let slug = base;
    let count = 0;
    while (
      await this.prisma.webinar.findUnique({ where: { slug } })
    ) {
      count += 1;
      slug = `${base}-${count}`;
    }
    return slug;
  }

  async create(data: Prisma.WebinarCreateInput) {
    const baseSlug = slugify((data as any).title || 'webinar');
    const slug = await this.ensureUniqueSlug(baseSlug);
    return this.prisma.webinar.create({ data: { ...(data as any), slug } });
  }

  async findAll(params?: { skip?: number; take?: number }) {
    const { skip = 0, take = 50 } = params || {};
    return this.prisma.webinar.findMany({ skip, take, orderBy: { date: 'desc' } });
  }

  async findOneById(id: string) {
    return this.prisma.webinar.findUnique({ where: { id } });
  }

  async findOneBySlug(slug: string) {
    return this.prisma.webinar.findUnique({ where: { slug } });
  }

  async update(id: string, data: Prisma.WebinarUpdateInput) {
    // If title is being updated, recalc slug
    if ((data as any).title) {
      const baseSlug = slugify((data as any).title as string);
      (data as any).slug = await this.ensureUniqueSlug(baseSlug);
    }

    return this.prisma.webinar.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.webinar.delete({ where: { id } });
  }
}
