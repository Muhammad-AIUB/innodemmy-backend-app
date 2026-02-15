import { Module } from '@nestjs/common';
import {
  BlogsAdminController,
  BlogsPublicController,
} from './blogs.controller';
import { BlogsRepository } from './blogs.repository';
import { BlogsService } from './blogs.service';

@Module({
  controllers: [BlogsPublicController, BlogsAdminController],
  providers: [BlogsService, BlogsRepository],
  exports: [BlogsService],
})
export class BlogsModule {}
