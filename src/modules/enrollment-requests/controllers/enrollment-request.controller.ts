import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EnrollmentRequestStatus, UserRole } from '@prisma/client';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  AdminAudit,
  AdminAuditInterceptor,
} from '../../../common/interceptors/admin-audit.interceptor';
import { EnrollmentRequestService } from '../services/enrollment-request.service';
import { CreateEnrollmentRequestDto } from '../dto/create-enrollment-request.dto';
import { AdminActionDto } from '../dto/admin-action.dto';
import { UploadService } from '../../upload/upload.service';
import type { FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user: { sub: string; role: UserRole };
}

// ─── ENROLLMENT REQUEST CONTROLLER ──────────────────────────────────────────

@ApiTags('Enrollment Requests')
@Controller('enrollment-requests')
export class EnrollmentRequestStudentController {
  constructor(
    private readonly service: EnrollmentRequestService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Submit an enrollment request with payment proof.
   * POST /api/v1/enrollment-requests
   * Accessible to: STUDENT, ADMIN, SUPER_ADMIN (admins can enroll for testing)
   *
   * Accepts either:
   * 1. JSON body with screenshotUrl (external URL)
   * 2. Multipart form data with screenshot file + form fields
   *    File is saved ONLY after enrollment request is created successfully.
   */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit enrollment request' })
  async create(@Req() req: AuthenticatedRequest) {
    const contentType = req.headers['content-type'] || '';

    // ─── MULTIPART: file upload mode ──────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const fields: Record<string, string> = {};
      let fileBuffer: Buffer | null = null;
      let fileFilename = '';
      let fileMimetype = '';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parts = req.parts();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      for await (const part of parts) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (part.type === 'file') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (part.fieldname === 'screenshot') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            fileBuffer = await part.toBuffer();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            fileFilename = part.filename;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            fileMimetype = part.mimetype;
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          fields[part.fieldname as string] = part.value as string;
        }
      }

      if (!fields.courseId || !fields.paymentMethod || !fields.transactionId) {
        throw new BadRequestException(
          'courseId, paymentMethod, and transactionId are required',
        );
      }

      // Determine screenshotUrl: either from file or from form field
      let screenshotUrl = fields.screenshotUrl || '';

      if (fileBuffer) {
        // Validate file type
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (!this.uploadService.validateImageType(fileMimetype)) {
          throw new BadRequestException(
            'Invalid file type. Only JPEG, PNG, and WEBP are allowed.',
          );
        }
        // Validate file size (5MB max)
        if (!this.uploadService.validateFileSize(fileBuffer.length, 5)) {
          throw new BadRequestException('File size exceeds 5MB limit');
        }
      } else if (!screenshotUrl) {
        throw new BadRequestException(
          'Either a screenshot file or screenshotUrl is required',
        );
      }

      // Build DTO for validation
      const dto = new CreateEnrollmentRequestDto();
      dto.courseId = fields.courseId;
      dto.paymentMethod = fields.paymentMethod;
      dto.transactionId = fields.transactionId;
      dto.screenshotUrl = screenshotUrl || 'pending-upload';

      // ── Create enrollment request FIRST (no file saved yet) ──
      const data = await this.service.createRequest(req.user.sub, dto);

      // ── NOW save the file (only after successful enrollment creation) ──
      if (fileBuffer) {
        screenshotUrl = await this.uploadService.saveFile(
          fileBuffer,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          fileFilename,
          'images',
        );
        // Update the enrollment request with the actual screenshot URL
        await this.service.updateScreenshotUrl(data.id, screenshotUrl);
        return { success: true, data: { ...data, screenshotUrl } };
      }

      return { success: true, data };
    }

    // ─── JSON: URL mode ───────────────────────────────────────────────
    const dto = req.body as CreateEnrollmentRequestDto;
    const data = await this.service.createRequest(req.user.sub, dto);
    return { success: true, data };
  }
}

// ─── ADMIN CONTROLLER ────────────────────────────────────────────────────────

@ApiTags('Enrollment Requests (Admin)')
@Controller('admin/enrollment-requests')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class EnrollmentRequestAdminController {
  constructor(private readonly service: EnrollmentRequestService) {}

  /**
   * ADMIN: List enrollment requests, optionally filtered by status.
   * GET /api/v1/admin/enrollment-requests?status=PENDING
   */
  @Get()
  @ApiOperation({ summary: 'List enrollment requests (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EnrollmentRequestStatus,
  })
  async findAll(@Query('status') status?: EnrollmentRequestStatus) {
    const data = await this.service.findAll(status);
    return { success: true, data };
  }

  /**
   * ADMIN: Approve an enrollment request.
   * PATCH /api/v1/admin/enrollment-requests/:id/approve
   */
  @Patch(':id/approve')
  @UseInterceptors(AdminAuditInterceptor)
  @AdminAudit({
    action: 'ENROLLMENT_REQUEST_APPROVED',
    entity: 'EnrollmentRequest',
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Approve enrollment request (admin)' })
  async approve(@Param('id') id: string, @Body() dto: AdminActionDto) {
    const data = await this.service.approve(id, dto.adminNote);
    return { success: true, data };
  }

  /**
   * ADMIN: Reject an enrollment request.
   * PATCH /api/v1/admin/enrollment-requests/:id/reject
   */
  @Patch(':id/reject')
  @UseInterceptors(AdminAuditInterceptor)
  @AdminAudit({
    action: 'ENROLLMENT_REQUEST_REJECTED',
    entity: 'EnrollmentRequest',
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Reject enrollment request (admin)' })
  async reject(@Param('id') id: string, @Body() dto: AdminActionDto) {
    const data = await this.service.reject(id, dto.adminNote);
    return { success: true, data };
  }
}
