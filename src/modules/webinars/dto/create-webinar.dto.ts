import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { WebinarStatus } from '@prisma/client';

export { WebinarStatus };

export class CreateWebinarDto {
  @ApiProperty({ example: 'Intro to Clean Architecture' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A practical webinar about clean architecture' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: 'Section one' })
  @IsOptional()
  @IsString()
  sectionOneTitle?: string;

  @ApiProperty({ example: ['point 1', 'point 2'] })
  @IsOptional()
  @IsArray()
  sectionOnePoints?: string[];

  @ApiProperty({ example: 'Section two' })
  @IsOptional()
  @IsString()
  sectionTwoTitle?: string;

  @ApiProperty({ example: ['point a', 'point b'] })
  @IsOptional()
  @IsArray()
  sectionTwoPoints?: string[];

  @ApiProperty({ enum: WebinarStatus, default: WebinarStatus.DRAFT })
  @IsOptional()
  @IsEnum(WebinarStatus)
  status?: WebinarStatus;
}
