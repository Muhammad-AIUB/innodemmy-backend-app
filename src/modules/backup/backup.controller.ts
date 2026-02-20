import {
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';

@ApiTags('Admin — Backup')
@Controller('admin/backup')
@UseGuards(JwtGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * POST /api/v1/admin/backup
   *
   * Manually triggers an immediate database backup.
   * Restricted to SUPER_ADMIN role.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Trigger a manual database backup',
    description:
      'Runs pg_dump immediately and stores the backup file on the server. ' +
      'Accessible by SUPER_ADMIN only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backup completed successfully.',
    schema: {
      example: {
        message: 'Backup completed successfully.',
        file: '/backups/backup-2026-02-21.sql',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Backup failed.',
  })
  async triggerBackup(): Promise<{ message: string; file: string }> {
    try {
      const file = await this.backupService.runBackup();
      return { message: 'Backup completed successfully.', file };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Backup failed.';
      throw new InternalServerErrorException(message);
    }
  }
}
