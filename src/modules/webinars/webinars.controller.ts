import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WebinarsService } from './webinars.service';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';

@ApiTags('webinars')
@Controller('webinars')
export class WebinarsController {
  constructor(private readonly service: WebinarsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webinar' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateWebinarDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webinars' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.service.findAll(Number(skip) || 0, Number(take) || 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webinar by id or slug' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webinar' })
  update(@Param('id') id: string, @Body() dto: UpdateWebinarDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webinar' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
