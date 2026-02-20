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
import { EnrollmentGuard } from '../../enrollments/guards/enrollment.guard';
import { LessonService } from '../services/lesson.service';
import { CreateLessonDto } from '../dto/create-lesson.dto';

/**
 * Lesson routes are nested under /courses/:courseId.
 * The :courseId param is used by EnrollmentGuard to verify active enrollment.
 */
@ApiTags('Lessons')
@Controller('courses/:courseId/lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  /**
   * ADMIN / SUPER_ADMIN: Create a lesson within a module.
   * POST /api/v1/courses/:courseId/lessons
   */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lesson (admin)' })
  async create(@Body() dto: CreateLessonDto) {
    const data = await this.lessonService.create(
      dto.moduleId,
      dto.title,
      dto.type,
      dto.videoUrl,
    );
    return { success: true, data };
  }

  /**
   * STUDENT (active enrollment) / ADMIN / SUPER_ADMIN: List lessons for a course.
   * GET /api/v1/courses/:courseId/lessons
   *
   * JwtGuard validates the token first, then EnrollmentGuard checks active enrollment.
   * ADMIN and SUPER_ADMIN bypass the enrollment check inside EnrollmentGuard.
   */
  @Get()
  @UseGuards(JwtGuard, EnrollmentGuard)
  @ApiOperation({
    summary: 'List all lessons for a course (enrolled students & admins)',
  })
  async findByCourse(@Param('courseId') courseId: string) {
    const data = await this.lessonService.findByCourse(courseId);
    return { success: true, data };
  }

  /**
   * STUDENT (active enrollment) / ADMIN / SUPER_ADMIN: Get a single lesson.
   * GET /api/v1/courses/:courseId/lessons/:lessonId
   */
  @Get(':lessonId')
  @UseGuards(JwtGuard, EnrollmentGuard)
  @ApiOperation({ summary: 'Get a lesson by ID (enrolled students & admins)' })
  async findOne(@Param('lessonId') lessonId: string) {
    const data = await this.lessonService.findById(lessonId);
    return { success: true, data };
  }

  /**
   * ADMIN / SUPER_ADMIN: Delete a lesson.
   * DELETE /api/v1/courses/:courseId/lessons/:lessonId
   */
  @Delete(':lessonId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson (admin)' })
  async remove(@Param('lessonId') lessonId: string) {
    await this.lessonService.remove(lessonId);
  }
}
