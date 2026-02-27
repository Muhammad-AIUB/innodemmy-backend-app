import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CoursesService } from '../services/courses.service';
import { AdminAuditInterceptor } from '../../../common/interceptors/admin-audit.interceptor';

@ApiTags('courses-admin-analytics')
@Controller('admin/courses')
@UseGuards(JwtGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@ApiBearerAuth()
export class CourseAnalyticsController {
  constructor(private readonly service: CoursesService) {}

  @Get(':courseId/analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get analytics overview for an admin course' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCourseAnalytics(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    const data = await this.service.getCourseAnalytics(
      courseId,
      req.user.sub,
      req.user.role,
    );

    return { success: true, data };
  }
}
