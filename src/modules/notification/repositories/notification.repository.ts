import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────

  async create(data: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  /**
   * Bulk-create notifications for multiple users (e.g. webinar broadcast).
   */
  async createMany(
    notifications: CreateNotificationInput[],
  ): Promise<{ count: number }> {
    return this.prisma.notification.createMany({ data: notifications });
  }

  // ─── FIND ────────────────────────────────────────────────────────────────

  /**
   * Return all notifications for a user ordered by newest first.
   * Uses indexed query on userId – no unnecessary joins.
   */
  async findByUserId(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications of a user as read.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── COUNT ───────────────────────────────────────────────────────────────

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
