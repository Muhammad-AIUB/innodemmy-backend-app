import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async readiness() {
    return this.healthService.readiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  async liveness() {
    return this.healthService.liveness();
  }
}
