import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { BlogContentBlock } from '../types/blog-content-block.type';
import { IsValidContentBlocks } from '../validators/is-valid-content-blocks.validator';

export class CreateBlogDto {
  @ApiProperty({ example: 'How to Build Scalable NestJS Modules' })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(200, { message: 'title must not exceed 200 characters' })
  title: string;

  @ApiPropertyOptional({
    example: 'A practical guide for domain-driven modules.',
  })
  @IsOptional()
  @IsString({ message: 'excerpt must be a string' })
  @MaxLength(500, { message: 'excerpt must not exceed 500 characters' })
  excerpt?: string;

  @ApiProperty({
    description: 'TipTap JSON content',
    example: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello blog' }],
        },
      ],
    },
  })
  @IsObject({ message: 'content must be a valid TipTap JSON object' })
  content: Prisma.InputJsonValue;

  @ApiPropertyOptional({
    description: 'Structured content blocks for the blog post',
    example: [
      { type: 'heading', value: 'Introduction' },
      { type: 'text', value: 'This is the first paragraph.' },
      { type: 'image', url: 'https://cdn.example.com/photo.jpg', alt: 'Photo' },
      { type: 'quote', value: 'Knowledge is power.' },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'contentBlocks must be an array' })
  @ArrayMaxSize(200, {
    message: 'contentBlocks must not contain more than 200 blocks',
  })
  @IsValidContentBlocks({
    message:
      'Each content block must have a valid type (text, image, heading, quote) and correct shape',
  })
  contentBlocks?: BlogContentBlock[];

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/images/blog-banner.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'bannerImage must be a valid URL' })
  bannerImage?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'readDuration must be an integer number' })
  @Min(1, { message: 'readDuration must be at least 1 minute' })
  readDuration?: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'authorId must be a valid UUID' })
  authorId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tag ids (UUID)',
    example: [
      '86b4f6f3-4a42-4d64-929e-d3cd8fc157f8',
      '95ea6d74-f5de-4cd4-9d7f-af9ec8d84ef2',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'tagIds must be an array' })
  @ArrayMaxSize(20, { message: 'tagIds must not contain more than 20 ids' })
  @IsUUID('4', { each: true, message: 'each tagId must be a valid UUID' })
  tagIds?: string[];

  @ApiPropertyOptional({ example: 'Scalable NestJS Blog Architecture' })
  @IsOptional()
  @IsString({ message: 'seoTitle must be a string' })
  @MaxLength(160, { message: 'seoTitle must not exceed 160 characters' })
  seoTitle?: string;

  @ApiPropertyOptional({
    example: 'Build production-ready blog APIs using NestJS and Prisma.',
  })
  @IsOptional()
  @IsString({ message: 'seoDescription must be a string' })
  @MaxLength(320, { message: 'seoDescription must not exceed 320 characters' })
  seoDescription?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['nestjs', 'prisma', 'backend'],
  })
  @IsOptional()
  @IsArray({ message: 'seoKeywords must be an array' })
  @ArrayMaxSize(30, {
    message: 'seoKeywords must not contain more than 30 items',
  })
  @IsString({ each: true, message: 'each seoKeyword must be a string' })
  seoKeywords?: string[];
}
