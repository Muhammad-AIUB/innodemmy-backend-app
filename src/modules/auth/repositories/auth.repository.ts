import { Injectable } from '@nestjs/common';
import { OtpCode, Prisma, User, UserRole } from '@prisma/client';
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

  async findAllUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    order?: string;
    isActive?: string;
    isDeleted?: string;
  }): Promise<{ users: User[]; total: number }> {
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit =
      options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;
    const search = options?.search?.trim();
    const role = options?.role?.toUpperCase();
    const sortBy = options?.sortBy ?? 'createdAt';
    const order =
      options?.order && options.order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const isActive =
      options?.isActive === 'true'
        ? true
        : options?.isActive === 'false'
          ? false
          : undefined;
    const isDeleted =
      options?.isDeleted === 'true'
        ? true
        : options?.isDeleted === 'false'
          ? false
          : undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const roleFilter =
      role && Object.values(UserRole).includes(role as UserRole)
        ? { role: role as UserRole }
        : undefined;

    const flagsFilter =
      isActive !== undefined || isDeleted !== undefined
        ? {
            ...(isActive !== undefined ? { isActive } : {}),
            ...(isDeleted !== undefined ? { isDeleted } : {}),
          }
        : undefined;

    const andParts = [where, roleFilter, flagsFilter].filter(Boolean);
    const finalWhere =
      andParts.length > 1 ? { AND: andParts } : (andParts[0] as object);

    const allowedSortFields = new Set(['createdAt', 'email', 'name', 'role']);
    const finalSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: finalWhere,
        orderBy: { [finalSortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: finalWhere }),
    ]);

    return { users, total };
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async deactivateUser(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, isDeleted: true },
    });
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
