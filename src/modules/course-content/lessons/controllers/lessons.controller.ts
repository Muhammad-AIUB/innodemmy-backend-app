import {
  Body,
  Controller,
  Delete,
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
import { JwtPayload } from '../../../auth/strategies/jwt.strategy';
import { LessonsService } from '../services/lessons.service';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { ReorderDto } from '../../dto/reorder.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

/**
 * Routes:
 *  POST   /modules/:moduleId/lessons  — create
 *  PATCH  /lessons/:id                — update
 *  DELETE /lessons/:id                — delete
 */
@ApiTags('Lessons')
@Controller('')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  /**
   * POST /api/v1/modules/:moduleId/lessons
   * Creates a lesson (and Quiz/Assignment side-record) inside a module.
   * ADMIN must own the course; SUPER_ADMIN bypasses.
   */
  @Post('modules/:moduleId/lessons')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a lesson inside a module (admin/super-admin)',
  })
  async create(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.lessonsService.create(moduleId, dto, req.user);
    return { success: true, data };
  }

  /**
   * PATCH /api/v1/lessons/:id
   * Update a lesson's title, type, or videoUrl.
   */
  @Patch('lessons/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a lesson (admin/super-admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.lessonsService.update(id, dto, req.user);
    return { success: true, data };
  }

  /**
   * DELETE /api/v1/lessons/:id
   * Hard-delete a lesson + Quiz/Assignment + Submissions (atomic transaction).
   */
  @Delete('lessons/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson (admin/super-admin)' })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.lessonsService.delete(id, req.user);
  }

  /**
   * PATCH /api/v1/lessons/:id/reorder
   * ADMIN (owner) / SUPER_ADMIN — reorder a lesson within its module.
   */
  @Patch('lessons/:id/reorder')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reorder a lesson up or down (admin/super-admin)' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderDto,
    @Req() req: AuthRequest,
  ) {
    await this.lessonsService.reorder(id, dto.direction, req.user);
    return { success: true };
  }
}
