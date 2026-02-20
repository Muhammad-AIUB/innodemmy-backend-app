import { Injectable } from '@nestjs/common';
import { OtpCode, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── USER QUERIES ─────────────────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // ─── OTP QUERIES ──────────────────────────────────────────────────────────

  async createOtp(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<OtpCode> {
    return this.prisma.otpCode.create({
      data: { email, code, expiresAt, isUsed: false },
    });
  }

  async findLatestValidOtp(
    email: string,
    code: string,
  ): Promise<OtpCode | null> {
    return this.prisma.otpCode.findFirst({
      where: {
        email,
        code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markOtpUsed(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  async invalidatePreviousOtps(email: string): Promise<void> {
    await this.prisma.otpCode.updateMany({
      where: { email, isUsed: false },
      data: { isUsed: true },
    });
  }
}
