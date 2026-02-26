import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CourseStatus } from '@prisma/client';
import { ListCoursesQueryDto } from './course.query';

export class AdminListCoursesQueryDto extends ListCoursesQueryDto {
  @ApiPropertyOptional({ enum: CourseStatus, example: 'DRAFT' })
  @IsOptional()
  @IsEnum(CourseStatus, {
    message: 'status must be either DRAFT or PUBLISHED',
  })
  status?: CourseStatus;
}
