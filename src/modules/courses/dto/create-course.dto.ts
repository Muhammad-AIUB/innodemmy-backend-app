import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to NestJS',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the fundamentals of NestJS framework',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Instructor name',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  instructor?: string;

  @ApiProperty({ description: 'Course price', example: 99.99, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Course duration in minutes',
    example: 120,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  duration?: number;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
    default: CourseLevel.BEGINNER,
  })
  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @ApiProperty({
    description: 'Course thumbnail URL',
    example: 'https://example.com/thumbnail.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    description: 'Is course published',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
