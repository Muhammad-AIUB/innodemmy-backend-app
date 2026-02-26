import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MarkLessonCompleteDto {
  @ApiProperty({
    description: 'UUID of the lesson to mark as complete',
    example: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;
}
