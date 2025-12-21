import { IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleCompleteSignupDto {
  @ApiProperty({ example: 'Rahim Khan' })
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsNotEmpty()
  confirmPassword: string;
}
