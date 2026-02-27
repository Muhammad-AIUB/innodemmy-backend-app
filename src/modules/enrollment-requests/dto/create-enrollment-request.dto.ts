import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateEnrollmentRequestDto {
  @ApiProperty({ description: 'Course ID to enroll in' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: ['bkash', 'nagad', 'bank'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['bkash', 'nagad', 'bank'], {
    message: 'paymentMethod must be one of: bkash, nagad, bank',
  })
  paymentMethod: string;

  @ApiProperty({ description: 'Transaction ID from the payment provider' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    description: 'URL of the payment screenshot',
    example: 'https://res.cloudinary.com/xxx/screenshot.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'screenshotUrl must be a valid URL' })
  screenshotUrl: string;
}
