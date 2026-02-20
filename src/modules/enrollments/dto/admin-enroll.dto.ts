import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminEnrollDto {
  @ApiProperty({ description: 'Student user ID to enroll' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Course ID to enroll the student in' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
