import { Module } from '@nestjs/common';
import { WebinarsController } from './webinars.controller';
import { WebinarsService } from './webinars.service';
import { WebinarsRepository } from './webinars.repository';

@Module({
  controllers: [WebinarsController],
  providers: [WebinarsService, WebinarsRepository],
  exports: [WebinarsService],
})
export class WebinarsModule {}
