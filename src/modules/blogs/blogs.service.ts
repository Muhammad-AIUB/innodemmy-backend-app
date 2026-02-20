import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogStatus, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { generateSlug } from '../../common/utils/slugify';
import { CreateBlogDto } from './dto/create-blog.dto';
import { PublishBlogDto } from './dto/publish-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import {
  BlogEntity,
  BlogsRepository,
  PublishedBlogListEntity,
} from './blogs.repository';
import { ListBlogsQueryDto } from './queries/blog.query';
import { CacheService } from '../../shared/cache/cache.service';

/** TTL constants (milliseconds) */
const CACHE_LIST_TTL = 5 * 60_000;
const CACHE_ITEM_TTL = 10 * 60_000;
const CACHE_PREFIX = 'blogs:';

type PublicBlogListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bannerImage: string | null;
  readDuration: number | null;
  publishedAt: Date | null;
};

type PublicBlogDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Prisma.JsonValue;
  bannerImage: string | null;
  readDuration: number | null;
  publishedAt: Date | null;
  author: {
    id: string;
    name: string;
    bio: string | null;
    avatar: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
  seo: {
    title: string | null;
    description: string | null;
    keywords: string[];
  };
};

type AdminBlogResponse = PublicBlogDetail & {
  status: BlogStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedBlogsResponse = {
  data: PublicBlogListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class BlogsService {
  constructor(
    private readonly repo: BlogsRepository,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateBlogDto): Promise<AdminBlogResponse> {
    const blog = await this.createWithUniqueSlug(dto);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(blog);
  }

  async update(id: string, dto: UpdateBlogDto): Promise<AdminBlogResponse> {
    const existing = await this.ensureExists(id);
    const updateData: Prisma.BlogUpdateInput = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      updateData.title = dto.title;
      updateData.slug = await this.generateUniqueSlug(dto.title, id);
    }

    if (dto.excerpt !== undefined) {
      updateData.excerpt = dto.excerpt;
    }

    if (dto.content !== undefined) {
      updateData.content = dto.content;
    }

    if (dto.bannerImage !== undefined) {
      updateData.bannerImage = dto.bannerImage;
    }

    if (dto.readDuration !== undefined) {
      updateData.readDuration = dto.readDuration;
    }

    if (dto.seoTitle !== undefined) {
      updateData.seoTitle = dto.seoTitle;
    }

    if (dto.seoDescription !== undefined) {
      updateData.seoDescription = dto.seoDescription;
    }

    if (dto.seoKeywords !== undefined) {
      updateData.seoKeywords = dto.seoKeywords;
    }

    if (dto.authorId !== undefined) {
      updateData.author = {
        connect: {
          id: dto.authorId,
        },
      };
    }

    if (dto.categoryId !== undefined) {
      updateData.category = dto.categoryId
        ? {
            connect: {
              id: dto.categoryId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (dto.tagIds !== undefined) {
      updateData.tags = {
        deleteMany: {},
        ...(dto.tagIds.length > 0
          ? {
              createMany: {
                data: dto.tagIds.map((tagId) => ({ tagId })),
                skipDuplicates: true,
              },
            }
          : {}),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return this.mapAdminResponse(existing);
    }

    const updated = await this.repo.update(id, updateData);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(updated);
  }

  async publish(id: string, dto: PublishBlogDto): Promise<AdminBlogResponse> {
    await this.ensureExists(id);

    const published = await this.repo.update(id, {
      status: BlogStatus.PUBLISHED,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
    });

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(published);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.repo.softDelete(id);

    this.cache.delByPrefix(CACHE_PREFIX);
  }

  /**
   * Public listing — results are cached per page/limit/categoryId key.
   * Cache is automatically invalidated on any mutation.
   */
  async findPublished(
    query: ListBlogsQueryDto,
  ): Promise<PaginatedBlogsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const categoryId = query.categoryId ?? '';
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}public:list:${page}:${limit}:${categoryId}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const [items, total] = await Promise.all([
          this.repo.findPublishedPaginated({
            skip,
            take: limit,
            categoryId: categoryId || undefined,
          }),
          this.repo.countPublished(categoryId || undefined),
        ]);

        return {
          data: items.map((item) => this.mapPublicListItem(item)),
          meta: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          },
        };
      },
      CACHE_LIST_TTL,
    );
  }

  /**
   * Public single-blog lookup by slug — cached per slug.
   */
  async findPublishedBySlug(slug: string): Promise<PublicBlogDetail> {
    return this.cache.wrap(
      `${CACHE_PREFIX}public:slug:${slug}`,
      async () => {
        const blog = await this.repo.findPublishedBySlug(slug);
        if (!blog) {
          throw new NotFoundException('Blog not found');
        }
        return this.mapPublicDetail(blog);
      },
      CACHE_ITEM_TTL,
    );
  }
  private async ensureExists(id: string): Promise<BlogEntity> {
    const blog = await this.repo.findById(id);

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  private async createWithUniqueSlug(dto: CreateBlogDto): Promise<BlogEntity> {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const seed =
        attempt === 0 ? dto.title : `${dto.title}-${Date.now()}-${attempt}`;
      const slug = await this.generateUniqueSlug(seed);

      try {
        return await this.repo.create({
          title: dto.title,
          slug,
          excerpt: dto.excerpt,
          content: dto.content,
          bannerImage: dto.bannerImage,
          readDuration: dto.readDuration,
          status: BlogStatus.DRAFT,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          seoKeywords: dto.seoKeywords ?? [],
          author: {
            connect: {
              id: dto.authorId,
            },
          },
          ...(dto.categoryId
            ? {
                category: {
                  connect: {
                    id: dto.categoryId,
                  },
                },
              }
            : {}),
          ...(dto.tagIds?.length
            ? {
                tags: {
                  createMany: {
                    data: dto.tagIds.map((tagId) => ({ tagId })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        });
      } catch (error: unknown) {
        if (this.isSlugUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Could not create a unique slug for this blog');
  }

  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const base = generateSlug(title) || 'blog';
    let suffix = 0;

    while (suffix < 5000) {
      const candidate = suffix === 0 ? base : `${base}-${suffix}`;
      const exists = await this.repo.existsBySlug(candidate, excludeId);

      if (!exists) {
        return candidate;
      }

      suffix += 1;
    }

    throw new ConflictException('Could not create a unique slug for this blog');
  }

  private isSlugUniqueViolation(error: unknown): boolean {
    if (!(error instanceof PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const meta = error.meta;
    if (!meta || typeof meta !== 'object' || !('target' in meta)) {
      return false;
    }

    const target = meta.target;

    if (Array.isArray(target)) {
      return target.includes('slug');
    }

    return typeof target === 'string' && target.includes('slug');
  }

  private mapPublicListItem(item: PublishedBlogListEntity): PublicBlogListItem {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      bannerImage: item.bannerImage,
      readDuration: item.readDuration,
      publishedAt: item.publishedAt,
    };
  }

  private mapPublicDetail(blog: BlogEntity): PublicBlogDetail {
    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      bannerImage: blog.bannerImage,
      readDuration: blog.readDuration,
      publishedAt: blog.publishedAt,
      author: {
        id: blog.author.id,
        name: blog.author.name,
        bio: blog.author.bio,
        avatar: blog.author.avatar,
      },
      category: blog.category
        ? {
            id: blog.category.id,
            name: blog.category.name,
            slug: blog.category.slug,
          }
        : null,
      tags: blog.tags.map((relation) => ({
        id: relation.tag.id,
        name: relation.tag.name,
      })),
      seo: {
        title: blog.seoTitle,
        description: blog.seoDescription,
        keywords: blog.seoKeywords,
      },
    };
  }

  private mapAdminResponse(blog: BlogEntity): AdminBlogResponse {
    return {
      ...this.mapPublicDetail(blog),
      status: blog.status,
      isDeleted: blog.isDeleted,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    };
  }
}
