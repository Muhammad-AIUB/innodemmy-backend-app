import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminActionDto {
  @ApiPropertyOptional({ description: 'Optional note from admin' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
