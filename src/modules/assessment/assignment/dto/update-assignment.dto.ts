import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAssignmentDto {
  @ApiPropertyOptional({
    description: 'Updated assignment title',
    example: 'Week 3 Assignment',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated assignment description',
    example: 'Build a REST API with authentication',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
