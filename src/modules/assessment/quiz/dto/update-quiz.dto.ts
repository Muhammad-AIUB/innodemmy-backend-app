import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateQuizDto {
  @ApiProperty({ description: 'Updated quiz title', example: 'Final Quiz' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
