import {
  Body,
  Controller,
  Delete,
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
import { ModulesService } from '../services/modules.service';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

/**
 * Uses an empty controller prefix so each route method carries the full path.
 *
 * Course-scoped  → /courses/:courseId/modules
 * Resource-scoped → /modules/:id
 */
@ApiTags('Course Modules')
@Controller('')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  /**
   * POST /api/v1/courses/:courseId/modules
   * ADMIN (owner) / SUPER_ADMIN — create a module inside a course.
   */
  @Post('courses/:courseId/modules')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a module inside a course (admin/super-admin)' }) // prettier-ignore
  async create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.modulesService.create(courseId, dto, req.user);
    return { success: true, data };
  }

  /**
   * GET /api/v1/courses/:courseId/modules
   * JwtGuard + EnrollmentGuard — STUDENT (active) / ADMIN / SUPER_ADMIN.
   * Returns modules with nested lessons.
   */
  @Get('courses/:courseId/modules')
  @UseGuards(JwtGuard, EnrollmentGuard)
  @ApiOperation({
    summary: 'List modules + lessons for a course (enrolled students & admins)',
  })
  async findByCourse(@Param('courseId') courseId: string) {
    const data = await this.modulesService.findByCourseWithLessons(courseId);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/modules/:id
   * ADMIN (owner) / SUPER_ADMIN — update a module title.
   */
  @Patch('modules/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a module (admin/super-admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.modulesService.update(id, dto, req.user);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/modules/:id
   * ADMIN (owner) / SUPER_ADMIN — hard-delete module + all lessons (transaction).
   */
  @Delete('modules/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a module and all its lessons (admin/super-admin)',
  })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.modulesService.delete(id, req.user);
  }
}
