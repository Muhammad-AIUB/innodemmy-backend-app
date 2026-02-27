import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import {
  WebinarRegistrationPublicController,
  WebinarRegistrationAdminController,
} from './webinar-registration.controller';
import { WebinarRegistrationService } from './webinar-registration.service';
import { WebinarRegistrationRepository } from './webinar-registration.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    WebinarRegistrationPublicController,
    WebinarRegistrationAdminController,
  ],
  providers: [WebinarRegistrationService, WebinarRegistrationRepository],
})
export class WebinarRegistrationModule {}
