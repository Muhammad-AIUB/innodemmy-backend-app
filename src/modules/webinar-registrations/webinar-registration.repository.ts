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
}
