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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtGuard } from '../../../auth/guards/jwt.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { EnrollmentGuard } from '../../../enrollments/guards/enrollment.guard';
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';
import { AssignmentService } from '../services/assignment.service';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Assignment')
@Controller('')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  /**
   * PATCH /api/v1/assignment/:id
   * Update assignment title/description. ADMIN (owner) / SUPER_ADMIN only.
   */
  @Patch('assignment/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an assignment (admin/super-admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.assignmentService.update(id, dto, req.user);
    return { success: true, data };
  }

  /**
   * POST /api/v1/courses/:courseId/assignment/:assignmentId/submit
   * Submit an assignment. Enrolled students only.
   * courseId is required by EnrollmentGuard.
   */
  @Post('courses/:courseId/assignment/:assignmentId/submit')
  @UseGuards(JwtGuard, EnrollmentGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an assignment (enrolled students)' })
  async submit(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.assignmentService.submit(
      assignmentId,
      dto,
      req.user.sub,
    );
    return { success: true, data };
  }

  /**
   * GET /api/v1/assignment/:id/submissions
   * View all submissions for an assignment. ADMIN (owner) / SUPER_ADMIN only.
   */
  @Get('assignment/:id/submissions')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'View assignment submissions (admin/super-admin)',
  })
  async getSubmissions(@Param('id') id: string, @Req() req: AuthRequest) {
    const data = await this.assignmentService.getSubmissions(id, req.user);
    return { success: true, data };
  }
}
