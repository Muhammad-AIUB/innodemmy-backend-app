import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma, Webinar, WebinarStatus } from '@prisma/client';

/**
 * Narrow projection for public listing queries.
 * Only fetches the columns consumed by the public response mapper.
 */
export const webinarListSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  date: true,
  duration: true,
  sectionOneTitle: true,
  sectionOnePoints: true,
  sectionTwoTitle: true,
  sectionTwoPoints: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebinarSelect;

export type WebinarListItem = Prisma.WebinarGetPayload<{
  select: typeof webinarListSelect;
}>;

@Injectable()
export class WebinarsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WebinarCreateInput): Promise<Webinar> {
    return this.prisma.webinar.create({
      data,
    });
  }

  async findById(id: string): Promise<Webinar | null> {
    return this.prisma.webinar.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  async findBySlug(slug: string): Promise<Webinar | null> {
    return this.prisma.webinar.findUnique({
      where: { slug },
    });
  }

  async findSlugConflicts(
    baseSlug: string,
  ): Promise<Array<{ id: string; slug: string }>> {
    return this.prisma.webinar.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
  }

  async findPublishedBySlug(slug: string): Promise<Webinar | null> {
    return this.prisma.webinar.findFirst({
      where: {
        slug,
        status: WebinarStatus.PUBLISHED,
        isDeleted: false,
      },
    });
  }

  /**
   * Listing query — uses narrow SELECT to minimise per-row I/O.
   * Only the fields required by the public response mapper are fetched.
   */
  async findPublished(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<WebinarListItem[]> {
    const { skip, take, search } = params;

    const where: Prisma.WebinarWhereInput = {
      isDeleted: false,
      status: WebinarStatus.PUBLISHED,
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.webinar.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      select: webinarListSelect,
    });
  }

  async countPublished(search?: string): Promise<number> {
    const where: Prisma.WebinarWhereInput = {
      isDeleted: false,
      status: WebinarStatus.PUBLISHED,
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.webinar.count({
      where,
    });
  }

  async update(id: string, data: Prisma.WebinarUpdateInput): Promise<Webinar> {
    return this.prisma.webinar.update({
      where: { id },
      data,
    });
  }

  async publish(id: string): Promise<Webinar> {
    return this.prisma.webinar.update({
      where: { id },
      data: {
        status: WebinarStatus.PUBLISHED,
      },
    });
  }

  async softDelete(id: string): Promise<Webinar> {
    return this.prisma.webinar.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }
}
