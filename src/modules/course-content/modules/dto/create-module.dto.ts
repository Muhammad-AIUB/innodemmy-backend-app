import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Module title',
    example: 'Introduction to Node.js',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
