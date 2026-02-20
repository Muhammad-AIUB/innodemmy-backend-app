import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, Matches } from 'class-validator';

export class UploadSlipDto {
  @ApiProperty({
    description:
      'URL of the uploaded payment slip image (jpg, jpeg, png, pdf only, max 2MB)',
    example: 'https://res.cloudinary.com/xxx/payment-slip.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'slipUrl must be a valid URL' })
  @Matches(/\.(jpg|jpeg|png|pdf)(\?.*)?$/i, {
    message: 'Only jpg, jpeg, png, and pdf files are allowed.',
  })
  slipUrl: string;
}
