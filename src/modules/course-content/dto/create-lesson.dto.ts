import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: LessonType, description: 'Lesson type' })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({ description: 'Video URL (required for VIDEO type)' })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ description: 'Module ID this lesson belongs to' })
  @IsUUID()
  @IsNotEmpty()
  moduleId: string;
}
