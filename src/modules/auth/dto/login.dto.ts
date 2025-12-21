import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@gmail.com or Rahim Khan' })
  @IsNotEmpty()
  emailOrName: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsNotEmpty()
  password: string;
}
