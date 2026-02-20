import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ModuleService } from '../services/module.services';
import { CreateModuleDto } from '../dto/create-module.dto';

@ApiTags('Course Modules')
@Controller('courses/:courseId/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  /**
   * ADMIN / SUPER_ADMIN: Create a module in a course.
   * POST /api/v1/courses/:courseId/modules
   */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a course module (admin)' })
  async create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    const data = await this.moduleService.create(courseId, dto.title);
    return { success: true, data };
  }

  /**
   * Public: List all modules for a course.
   * GET /api/v1/courses/:courseId/modules
   */
  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'List all modules for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    const data = await this.moduleService.findByCourse(courseId);
    return { success: true, data };
  }

  /**
   * ADMIN / SUPER_ADMIN: Delete a module.
   * DELETE /api/v1/courses/:courseId/modules/:moduleId
   */
  @Delete(':moduleId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course module (admin)' })
  async remove(@Param('moduleId') moduleId: string) {
    await this.moduleService.remove(moduleId);
  }
}
