import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateModuleDto } from './create-module.dto';

export class UpdateModuleDto extends PartialType(CreateModuleDto) {
  @ApiPropertyOptional({ description: 'Updated module title' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;
}
