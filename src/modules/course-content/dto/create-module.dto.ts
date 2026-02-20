import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({ description: 'Module title' })
  @IsString()
  @IsNotEmpty()
  title: string;
}
