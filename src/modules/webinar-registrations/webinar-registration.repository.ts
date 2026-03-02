import { Injectable } from '@nestjs/common';
import { WebinarRegistration } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class WebinarRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    webinarId: string;
    name: string;
    email: string;
    phone: string;
  }): Promise<WebinarRegistration> {
    return this.prisma.webinarRegistration.create({ data });
  }

  async findByWebinarAndEmail(
    webinarId: string,
    email: string,
  ): Promise<WebinarRegistration | null> {
    return this.prisma.webinarRegistration.findUnique({
      where: { webinarId_email: { webinarId, email } },
    });
  }

  async findAllByWebinar(webinarId: string): Promise<WebinarRegistration[]> {
    return this.prisma.webinarRegistration.findMany({
      where: { webinarId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    webinarId?: string;
  }) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params?.webinarId) {
      where.webinarId = params.webinarId;
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [registrations, total] = await Promise.all([
      this.prisma.webinarRegistration.findMany({
        where,
        include: {
          webinar: {
            select: { id: true, title: true, date: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webinarRegistration.count({ where }),
    ]);

    return { registrations, total, page, limit };
  }

  async countAll(): Promise<number> {
    return this.prisma.webinarRegistration.count();
  }
}
