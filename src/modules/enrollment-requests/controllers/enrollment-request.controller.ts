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
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EnrollmentRequestStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
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

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: UserRole };
}

// ─── STUDENT CONTROLLER ──────────────────────────────────────────────────────

@ApiTags('Enrollment Requests')
@Controller('enrollment-requests')
export class EnrollmentRequestStudentController {
  constructor(private readonly service: EnrollmentRequestService) {}

  /**
   * STUDENT: Submit an enrollment request with payment proof.
   * POST /api/v1/enrollment-requests
   */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit enrollment request (student)' })
  async create(
    @Body() dto: CreateEnrollmentRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
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
