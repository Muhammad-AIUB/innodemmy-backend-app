import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PublishBlogDto {
  @ApiPropertyOptional({
    description:
      'Optional publish datetime. If not provided, current server time is used.',
    example: '2026-03-12T09:30:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'publishedAt must be a valid ISO-8601 datetime string' },
  )
  publishedAt?: string;
}
