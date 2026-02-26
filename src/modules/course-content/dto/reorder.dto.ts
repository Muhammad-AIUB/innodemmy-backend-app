import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    description: 'Direction to move the item',
    enum: ['up', 'down'],
    example: 'up',
  })
  @IsString()
  @IsIn(['up', 'down'])
  direction: 'up' | 'down';
}
