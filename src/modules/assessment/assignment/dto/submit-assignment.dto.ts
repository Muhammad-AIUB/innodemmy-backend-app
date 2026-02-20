import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SubmitAssignmentDto {
  @ApiProperty({
    description: 'URL of the submitted file',
    example: 'https://storage.example.com/submissions/file.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'fileUrl must be a valid URL' })
  fileUrl: string;
}
