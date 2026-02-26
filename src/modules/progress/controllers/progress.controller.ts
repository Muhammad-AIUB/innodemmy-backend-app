import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { ProgressService } from '../services/progress.service';
import { MarkLessonCompleteDto } from '../dto/mark-complete.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * GET /api/v1/progress/:courseId
   * Returns the authenticated user's progress for a specific course.
   */
  @Get(':courseId')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: "Get student's progress for a course" })
  async getCourseProgress(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.progressService.getCourseProgress(
      req.user.sub,
      courseId,
    );
    return { success: true, data };
  }

  /**
   * POST /api/v1/progress/complete
   * Marks a lesson as completed for the authenticated user. Idempotent.
   */
  @Post('complete')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lesson as complete' })
  async markLessonComplete(
    @Body() dto: MarkLessonCompleteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.progressService.markLessonComplete(
      req.user.sub,
      dto.lessonId,
    );
    return { success: true, data };
  }
}
