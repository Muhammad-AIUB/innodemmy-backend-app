import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'Understanding Event Loop',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    enum: LessonType,
    description: 'Lesson type: VIDEO | QUIZ | ASSIGNMENT',
  })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({
    description: 'Video URL — required when type = VIDEO',
  })
  @ValidateIf((o: CreateLessonDto) => o.type === LessonType.VIDEO)
  @IsUrl({}, { message: 'videoUrl must be a valid URL' })
  @IsNotEmpty({ message: 'videoUrl is required for VIDEO lessons' })
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Quiz title — required when type = QUIZ',
  })
  @ValidateIf((o: CreateLessonDto) => o.type === LessonType.QUIZ)
  @IsString()
  @IsNotEmpty({ message: 'quizTitle is required for QUIZ lessons' })
  @IsOptional()
  quizTitle?: string;

  @ApiPropertyOptional({
    description: 'Assignment title — required when type = ASSIGNMENT',
  })
  @ValidateIf((o: CreateLessonDto) => o.type === LessonType.ASSIGNMENT)
  @IsString()
  @IsNotEmpty({ message: 'assignmentTitle is required for ASSIGNMENT lessons' })
  @IsOptional()
  assignmentTitle?: string;

  @ApiPropertyOptional({
    description: 'Assignment description — required when type = ASSIGNMENT',
  })
  @ValidateIf((o: CreateLessonDto) => o.type === LessonType.ASSIGNMENT)
  @IsString()
  @IsNotEmpty({
    message: 'assignmentDescription is required for ASSIGNMENT lessons',
  })
  @IsOptional()
  assignmentDescription?: string;
}
