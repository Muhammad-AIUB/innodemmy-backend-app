import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LessonContentBlock } from './lesson-content-block.type';
import { IsLessonContentBlocks } from './lesson-content.validator';
import { IsUrlOrPath } from '../../../../common/validators/url-or-path.validator';

export class UpdateLessonDto {
  @ApiPropertyOptional({ description: 'Updated lesson title' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: LessonType, description: 'Updated lesson type' })
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Updated video URL (VIDEO lessons only)',
  })
  @IsUrlOrPath({ message: 'videoUrl must be a valid URL or path' })
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated structured lesson content blocks',
    type: 'array',
    example: [
      { type: 'text', value: 'Updated lesson intro' },
      { type: 'video', url: 'https://cdn.example.com/updated-lesson.mp4' },
      {
        type: 'resource',
        url: 'https://react.dev',
        label: 'React Docs',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @IsLessonContentBlocks()
  content?: LessonContentBlock[];
}
