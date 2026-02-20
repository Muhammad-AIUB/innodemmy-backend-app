import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Full-Stack Web Development Bootcamp' })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(200, { message: 'title must not exceed 200 characters' })
  title: string;

  @ApiProperty({ example: 'Learn full-stack development from scratch' })
  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @ApiProperty({ example: 'https://example.com/banner.jpg' })
  @IsString({ message: 'bannerImage must be a string' })
  @IsNotEmpty({ message: 'bannerImage is required' })
  bannerImage: string;

  @ApiProperty({ example: 4999.99 })
  @IsNumber({}, { message: 'price must be a number' })
  @Min(0, { message: 'price must be at least 0' })
  price: number;

  @ApiPropertyOptional({ example: 3999.99 })
  @IsOptional()
  @IsNumber({}, { message: 'discountPrice must be a number' })
  @Min(0, { message: 'discountPrice must be at least 0' })
  discountPrice?: number;

  @ApiProperty({ example: 90, description: 'Duration in days' })
  @IsInt({ message: 'duration must be an integer' })
  @Min(1, { message: 'duration must be at least 1' })
  duration: number;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  @IsDateString(
    {},
    { message: 'startDate must be a valid ISO-8601 datetime string' },
  )
  startDate: string;

  @ApiProperty({ example: 'Sat, Sun' })
  @IsString({ message: 'classDays must be a string' })
  @IsNotEmpty({ message: 'classDays is required' })
  classDays: string;

  @ApiProperty({ example: '10:00 AM - 12:00 PM' })
  @IsString({ message: 'classTime must be a string' })
  @IsNotEmpty({ message: 'classTime is required' })
  classTime: string;

  @ApiProperty({ example: 12 })
  @IsInt({ message: 'totalModules must be an integer' })
  @Min(0, { message: 'totalModules must be at least 0' })
  totalModules: number;

  @ApiProperty({ example: 5 })
  @IsInt({ message: 'totalProjects must be an integer' })
  @Min(0, { message: 'totalProjects must be at least 0' })
  totalProjects: number;

  @ApiProperty({ example: 24 })
  @IsInt({ message: 'totalLive must be an integer' })
  @Min(0, { message: 'totalLive must be at least 0' })
  totalLive: number;
}
