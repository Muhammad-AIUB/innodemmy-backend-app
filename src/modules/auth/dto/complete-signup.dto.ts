import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteSignupDto {
  @ApiProperty({ example: 'Rahim Khan' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '018xxxxxxxx' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsNotEmpty()
  confirmPassword: string;

  // Custom validation পরে pipe এ করব
}
