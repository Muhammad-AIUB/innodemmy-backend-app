import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma, WebinarStatus } from '@prisma/client';

@Injectable()
export class WebinarsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* =========================
     CREATE
  ========================== */
  async create(data: Prisma.WebinarCreateInput) {
    return this.prisma.webinar.create({
      data,
    });
  }

  /* =========================
     FIND ONE BY ID
  ========================== */
  async findOneById(id: string) {
    return this.prisma.webinar.findUnique({
      where: { id },
    });
  }

  /* =========================
     FIND ONE BY SLUG
  ========================== */
  async findOneBySlug(slug: string) {
    return this.prisma.webinar.findUnique({
      where: { slug },
    });
  }

  /* =========================
     FIND ALL (PUBLIC LIST)
  ========================== */
  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: WebinarStatus;
  }) {
    const {
      skip = 0,
      take = 10,
      search,
      status = WebinarStatus.PUBLISHED,
    } = params;

    return this.prisma.webinar.findMany({
      where: {
        isDeleted: false,
        status,
        ...(search && {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      skip,
      take,
      orderBy: {
        date: 'desc',
      },
    });
  }

  /* =========================
     COUNT (For Pagination Meta)
  ========================== */
  async count(params: { search?: string; status?: WebinarStatus }) {
    const { search, status = WebinarStatus.PUBLISHED } = params;

    return this.prisma.webinar.count({
      where: {
        isDeleted: false,
        status,
        ...(search && {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
    });
  }

  /* =========================
     UPDATE
  ========================== */
  async update(id: string, data: Prisma.WebinarUpdateInput) {
    return this.prisma.webinar.update({
      where: { id },
      data,
    });
  }

  /* =========================
     SOFT DELETE
  ========================== */
  async softDelete(id: string) {
    return this.prisma.webinar.update({
      where: { id },
      data: {
        isDeleted: true,
        status: WebinarStatus.DRAFT,
      },
    });
  }

  /* =========================
     HARD DELETE (Admin only if needed)
  ========================== */
  async hardDelete(id: string) {
    return this.prisma.webinar.delete({
      where: { id },
    });
  }

  /* =========================
     TRANSACTION SUPPORT (Future)
  ========================== */
  async runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
