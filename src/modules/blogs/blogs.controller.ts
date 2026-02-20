import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminAudit,
  AdminAuditInterceptor,
} from '../../common/interceptors/admin-audit.interceptor';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { PublishBlogDto } from './dto/publish-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { ListBlogsQueryDto } from './queries/blog.query';

@ApiTags('blogs-public')
@Controller('api/v1/blogs')
export class BlogsPublicController {
  constructor(private readonly service: BlogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get published blogs with pagination and optional category filter',
  })
  @ApiResponse({ status: 200 })
  findPublished(@Query() query: ListBlogsQueryDto) {
    return this.service.findPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published blog details by slug' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }
}

@ApiTags('blogs-admin')
@Controller('api/v1/admin/blogs')
export class BlogsAdminController {
  constructor(private readonly service: BlogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create blog as draft' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateBlogDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update blog by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBlogDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/publish')
  @UseInterceptors(AdminAuditInterceptor)
  @AdminAudit({ action: 'BLOG_PUBLISHED', entity: 'Blog', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Publish blog by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PublishBlogDto,
  ) {
    return this.service.publish(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete blog by id' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
