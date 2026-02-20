import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator';
import { FileSizeGuard } from '../../../common/guards/file-size.guard';
import {
  AdminAudit,
  AdminAuditInterceptor,
} from '../../../common/interceptors/admin-audit.interceptor';
import { PaymentService } from '../services/payment.service';
import { UploadSlipDto } from '../dto/upload-slip.dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: UserRole };
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * ADMIN: Get all pending payment requests.
   * GET /api/v1/payments/pending
   */
  @Get('pending')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all pending payment requests (admin)' })
  async getPendingPayments() {
    const data = await this.paymentService.getPendingPayments();
    return { success: true, data };
  }

  /**
   * STUDENT: Get payment link for a course.
   * GET /api/v1/payments/:courseId/link
   */
  @Get(':courseId/link')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get payment link for a course' })
  async getPaymentLink(@Param('courseId') courseId: string) {
    const data = await this.paymentService.getPaymentLink(courseId);
    return { success: true, data };
  }

  /**
   * STUDENT: Upload payment slip for a course.
   * POST /api/v1/payments/:courseId/upload-slip
   */
  @Post(':courseId/upload-slip')
  @RateLimit({ max: 10, timeWindow: '1 minute' })
  @UseGuards(JwtGuard, FileSizeGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload payment slip for a course' })
  async uploadSlip(
    @Param('courseId') courseId: string,
    @Body() dto: UploadSlipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.paymentService.uploadSlip(
      req.user.sub,
      courseId,
      dto.slipUrl,
    );
    return { success: true, data };
  }

  /**
   * ADMIN: Verify a payment.
   * PATCH /api/v1/payments/:id/verify
   */
  @Patch(':id/verify')
  @UseGuards(JwtGuard, RolesGuard)
  @UseInterceptors(AdminAuditInterceptor)
  @AdminAudit({
    action: 'PAYMENT_VERIFIED',
    entity: 'Payment',
    entityIdParam: 'id',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify a payment (admin)' })
  async verifyPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.paymentService.verifyPayment(id, req.user.sub);
    return { success: true, data };
  }

  /**
   * ADMIN: Reject a payment.
   * PATCH /api/v1/payments/:id/reject
   */
  @Patch(':id/reject')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject a payment (admin)' })
  async rejectPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.paymentService.rejectPayment(id, req.user.sub);
    return { success: true, data };
  }
}
