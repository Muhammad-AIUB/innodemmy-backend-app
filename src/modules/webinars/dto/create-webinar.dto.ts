import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ArrayMaxSize,
  ArrayNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateWebinarDto {
  @ApiProperty({ example: 'Intro to Clean Architecture' })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(150, { message: 'title must not exceed 150 characters' })
  title: string;

  @ApiProperty({ example: 'A practical webinar about clean architecture' })
  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  @IsDateString(
    {},
    { message: 'date must be a valid ISO-8601 datetime string' },
  )
  date: string;

  @ApiProperty({ example: 90 })
  @IsInt({ message: 'duration must be an integer value in minutes' })
  @Min(1, { message: 'duration must be at least 1 minute' })
  duration: number;

  @ApiProperty({ example: 'Section one' })
  @IsOptional()
  @IsString()
  sectionOneTitle?: string;

  @ApiProperty({ example: ['point 1', 'point 2'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sectionOnePoints?: string[];

  @ApiProperty({ example: 'Section two' })
  @IsOptional()
  @IsString()
  sectionTwoTitle?: string;

  @ApiProperty({ example: ['point a', 'point b'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sectionTwoPoints?: string[];
}
