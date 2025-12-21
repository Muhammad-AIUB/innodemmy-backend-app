import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddEmailDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail({}, { message: 'Valid email required' })
  @IsNotEmpty()
  email: string;
}
