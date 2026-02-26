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
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { ListCoursesQueryDto } from '../queries/course.query';
import { AdminListCoursesQueryDto } from '../queries/admin-course.query';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  AdminAudit,
  AdminAuditInterceptor,
} from '../../../common/interceptors/admin-audit.interceptor';

@ApiTags('courses-public')
@Controller('courses')
export class CoursesPublicController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List published courses with pagination' })
  @ApiResponse({ status: 200 })
  async findPublished(@Query() query: ListCoursesQueryDto) {
    const result = await this.service.findPublished(query);
    return { success: true, ...result };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published course by slug' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findPublishedBySlug(@Param('slug') slug: string) {
    const data = await this.service.findPublishedBySlug(slug);
    return { success: true, data };
  }
}

@ApiTags('courses-admin')
@Controller('api/v1/courses')
@UseGuards(JwtGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@ApiBearerAuth()
export class CoursesAdminController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List courses for admin (DRAFT + PUBLISHED)' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query() query: AdminListCoursesQueryDto,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    const result = await this.service.findAll(
      query,
      req.user.sub,
      req.user.role,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get single course by id (admin)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    const data = await this.service.findOne(id, req.user.sub, req.user.role);
    return { success: true, data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @AdminAudit({
    action: 'COURSE_CREATED',
    entity: 'Course',
    entityIdFromResponse: 'data.id',
  })
  @ApiOperation({ summary: 'Create course as DRAFT' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateCourseDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.service.create(dto, req.user.sub);
    return { success: true, data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update course by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCourseDto,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    const data = await this.service.update(
      id,
      dto,
      req.user.sub,
      req.user.role,
    );
    return { success: true, data };
  }

  @Patch(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Publish course by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    const data = await this.service.publish(id, req.user.sub, req.user.role);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete course by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    await this.service.remove(id, req.user.sub, req.user.role);
    return { success: true, data: null };
  }
}
