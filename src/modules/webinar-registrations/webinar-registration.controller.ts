import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WebinarRegistrationService } from './webinar-registration.service';
import { CreateWebinarRegistrationDto } from './dto/create-webinar-registration.dto';

// ─── PUBLIC CONTROLLER ──────────────────────────────────────────────────────

@ApiTags('Webinar Registrations')
@Controller('webinar-registrations')
export class WebinarRegistrationPublicController {
  constructor(private readonly service: WebinarRegistrationService) {}

  /**
   * PUBLIC: Register for a webinar (lead capture).
   * POST /api/v1/webinar-registrations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register for a webinar (public)' })
  async register(@Body() dto: CreateWebinarRegistrationDto) {
    const data = await this.service.register(dto);
    return { success: true, data };
  }
}

// ─── ADMIN CONTROLLER ───────────────────────────────────────────────────────

@ApiTags('Webinar Registrations (Admin)')
@Controller('admin/webinars')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class WebinarRegistrationAdminController {
  constructor(private readonly service: WebinarRegistrationService) {}

  /**
   * ADMIN: List registrations for a webinar.
   * GET /api/v1/admin/webinars/:webinarId/registrations
   */
  @Get(':webinarId/registrations')
  @ApiOperation({ summary: 'List webinar registrations (admin)' })
  async findAll(
    @Param('webinarId', new ParseUUIDPipe()) webinarId: string,
  ) {
    const data = await this.service.findAllByWebinar(webinarId);
    return { success: true, data };
  }
}
