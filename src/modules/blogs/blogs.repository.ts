import { Injectable } from '@nestjs/common';
import { BlogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const blogDetailInclude = {
  author: true,
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.BlogInclude;

const publishedListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  bannerImage: true,
  readDuration: true,
  publishedAt: true,
} satisfies Prisma.BlogSelect;

export type BlogEntity = Prisma.BlogGetPayload<{
  include: typeof blogDetailInclude;
}>;

export type PublishedBlogListEntity = Prisma.BlogGetPayload<{
  select: typeof publishedListSelect;
}>;

@Injectable()
export class BlogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BlogCreateInput): Promise<BlogEntity> {
    return this.prisma.blog.create({
      data,
      include: blogDetailInclude,
    });
  }

  update(id: string, data: Prisma.BlogUpdateInput): Promise<BlogEntity> {
    return this.prisma.blog.update({
      where: { id },
      data,
      include: blogDetailInclude,
    });
  }

  findById(id: string): Promise<BlogEntity | null> {
    return this.prisma.blog.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: blogDetailInclude,
    });
  }

  findPublishedBySlug(slug: string): Promise<BlogEntity | null> {
    return this.prisma.blog.findFirst({
      where: {
        slug,
        status: BlogStatus.PUBLISHED,
        isDeleted: false,
      },
      include: blogDetailInclude,
    });
  }

  findPublishedPaginated(params: {
    skip: number;
    take: number;
    categoryId?: string;
  }): Promise<PublishedBlogListEntity[]> {
    const { skip, take, categoryId } = params;

    return this.prisma.blog.findMany({
      where: {
        status: BlogStatus.PUBLISHED,
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
      },
      skip,
      take,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: publishedListSelect,
    });
  }

  findAdminPaginated(params: {
    skip: number;
    take: number;
    categoryId?: string;
  }): Promise<BlogEntity[]> {
    const { skip, take, categoryId } = params;

    return this.prisma.blog.findMany({
      where: {
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: blogDetailInclude,
    });
  }

  countPublished(categoryId?: string): Promise<number> {
    return this.prisma.blog.count({
      where: {
        status: BlogStatus.PUBLISHED,
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
      },
    });
  }

  countAdmin(categoryId?: string): Promise<number> {
    return this.prisma.blog.count({
      where: {
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
      },
    });
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const item = await this.prisma.blog.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
      },
    });

    return Boolean(item);
  }

  softDelete(id: string): Promise<{ id: string }> {
    return this.prisma.blog.update({
      where: { id },
      data: {
        isDeleted: true,
        status: BlogStatus.ARCHIVED,
      },
      select: {
        id: true,
      },
    });
  }
}
