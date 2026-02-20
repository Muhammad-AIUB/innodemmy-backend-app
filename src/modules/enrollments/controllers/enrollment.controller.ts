import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EnrollmentService } from '../services/enrollment.service';
import { AdminEnrollDto } from '../dto/admin-enroll.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: UserRole };
}

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * STUDENT: Self-enroll in a published course.
   * POST /api/v1/enrollments/:courseId
   */
  @Post(':courseId')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll in a course (student)' })
  async enroll(
    @Param('courseId') courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.enrollmentService.enrollSelf(
      req.user.sub,
      courseId,
    );
    return { success: true, data };
  }

  /**
   * ADMIN / SUPER_ADMIN: Manually enroll a student.
   * POST /api/v1/enrollments/admin/enroll
   */
  @Post('admin/enroll')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually enroll a student (admin)' })
  async adminEnroll(
    @Body() dto: AdminEnrollDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.enrollmentService.enrollStudent(
      req.user.sub,
      dto.studentId,
      dto.courseId,
    );
    return { success: true, data };
  }

  /**
   * ADMIN / SUPER_ADMIN: Activate an enrollment.
   * PATCH /api/v1/enrollments/:id/activate
   */
  @Patch(':id/activate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate an enrollment (admin)' })
  async activate(@Param('id') id: string) {
    const data = await this.enrollmentService.activate(id);
    return { success: true, data };
  }

  /**
   * ADMIN / SUPER_ADMIN: Cancel an enrollment.
   * PATCH /api/v1/enrollments/:id/cancel
   */
  @Patch(':id/cancel')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel an enrollment (admin)' })
  async cancel(@Param('id') id: string) {
    const data = await this.enrollmentService.cancel(id);
    return { success: true, data };
  }
}
