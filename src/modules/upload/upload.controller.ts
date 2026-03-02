import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UploadService } from './upload.service';
import { AdminAuditInterceptor } from '../../common/interceptors/admin-audit.interceptor';
import type { FastifyRequest } from 'fastify';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload image file
   * POST /api/v1/upload/image
   */
  @Post('image')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(AdminAuditInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload image file (max 5MB)' })
  async uploadImage(@Req() request: FastifyRequest) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const data = await request.file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const buffer = await data.toBuffer();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const mimetype = data.mimetype;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const filename = data.filename;

      // Validate file type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (!this.uploadService.validateImageType(mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WEBP are allowed.',
        );
      }

      // Validate file size (5MB max for images)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      if (!this.uploadService.validateFileSize(buffer.length, 5)) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const fileUrl = await this.uploadService.saveFile(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buffer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        filename,
        'images',
      );

      return {
        success: true,
        data: {
          url: fileUrl,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          filename,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          size: buffer.length,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Upload video file
   * POST /api/v1/upload/video
   */
  @Post('video')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(AdminAuditInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload video file (max 100MB)' })
  async uploadVideo(@Req() request: FastifyRequest) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const data = await request.file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const buffer = await data.toBuffer();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const mimetype = data.mimetype;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const filename = data.filename;

      // Validate file type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (!this.uploadService.validateVideoType(mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only MP4, WEBM, and OGG are allowed.',
        );
      }

      // Validate file size (100MB max for videos)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      if (!this.uploadService.validateFileSize(buffer.length, 100)) {
        throw new BadRequestException('File size exceeds 100MB limit');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const fileUrl = await this.uploadService.saveFile(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buffer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        filename,
        'videos',
      );

      return {
        success: true,
        data: {
          url: fileUrl,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          filename,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          size: buffer.length,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload file');
    }
  }
}
