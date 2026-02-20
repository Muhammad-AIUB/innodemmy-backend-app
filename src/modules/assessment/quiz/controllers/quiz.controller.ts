import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { QuizService } from '../services/quiz.service';
import { UpdateQuizDto } from '../dto/update-quiz.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Quiz')
@Controller('')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * PATCH /api/v1/quiz/:id
   * Update a quiz title. ADMIN (owner) / SUPER_ADMIN only.
   */
  @Patch('quiz/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a quiz (admin/super-admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
    @Req() req: AuthRequest,
  ) {
    const data = await this.quizService.update(id, dto, req.user);
    return { success: true, data };
  }

  /**
   * GET /api/v1/courses/:courseId/quiz/:lessonId
   * Get quiz for a lesson. Enrolled students / admins.
   * courseId is required by EnrollmentGuard.
   */
  @Get('courses/:courseId/quiz/:lessonId')
  @UseGuards(JwtGuard, EnrollmentGuard)
  @ApiOperation({ summary: 'Get quiz by lesson (enrolled students & admins)' })
  async findByLesson(@Param('lessonId') lessonId: string) {
    const data = await this.quizService.findByLessonId(lessonId);
    return { success: true, data };
  }
}
