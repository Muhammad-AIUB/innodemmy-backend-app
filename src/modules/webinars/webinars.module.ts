import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { WebinarsController } from './webinars.controller';
import { WebinarsService } from './webinars.service';
import { WebinarsRepository } from './webinars.repository';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [WebinarsController],
  providers: [WebinarsService, WebinarsRepository],
  exports: [WebinarsService],
})
export class WebinarsModule {}
