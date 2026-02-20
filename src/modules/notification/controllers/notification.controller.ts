import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── GET USER NOTIFICATIONS ──────────────────────────────────────────────

  /**
   * GET /api/v1/notifications
   * Returns all in-app notifications for the authenticated user.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all notifications for the logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Notifications fetched successfully.',
  })
  async getNotifications(@Request() req: { user: { sub: string } }) {
    const data = await this.notificationService.getUserNotifications(
      req.user.sub,
    );
    return { success: true, data };
  }

  // ─── MARK AS READ ────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a single notification as read.
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 403, description: 'Not your notification.' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.notificationService.markAsRead(id, req.user.sub);
    return { success: true, data };
  }

  // ─── MARK ALL AS READ ────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks all notifications for the current user as read.
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
  })
  async markAllAsRead(@Request() req: { user: { sub: string } }) {
    const data = await this.notificationService.markAllAsRead(req.user.sub);
    return { success: true, data };
  }
}
