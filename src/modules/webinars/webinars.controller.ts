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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebinarsService } from './webinars.service';
import { CreateWebinarDto } from './dto/webinar/create-webinar.dto';
import { UpdateWebinarDto } from './dto/webinar/update-webinar.dto';
import { ListWebinarsQueryDto } from './dto/webinar/list-webinars-query.dto';

@ApiTags('webinars')
@Controller('api/v1/webinars')
export class WebinarsController {
  constructor(private readonly service: WebinarsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List published webinars with pagination and optional title search',
  })
  @ApiResponse({ status: 200 })
  findPublished(@Query() query: ListWebinarsQueryDto) {
    return this.service.findPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get one published webinar by slug' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Webinar not found' })
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Create webinar as DRAFT' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateWebinarDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update webinar by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Webinar not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWebinarDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish webinar by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Webinar not found' })
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.publish(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete webinar by id' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Webinar not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
