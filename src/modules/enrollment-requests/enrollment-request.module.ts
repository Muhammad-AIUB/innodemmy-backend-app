import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';
import { UploadModule } from '../upload/upload.module';
import {
  EnrollmentRequestStudentController,
  EnrollmentRequestAdminController,
} from './controllers/enrollment-request.controller';
import { EnrollmentRequestService } from './services/enrollment-request.service';
import { EnrollmentRequestRepository } from './repositories/enrollment-request.repository';

@Module({
  imports: [PrismaModule, EnrollmentModule, UploadModule],
  controllers: [
    EnrollmentRequestStudentController,
    EnrollmentRequestAdminController,
  ],
  providers: [EnrollmentRequestService, EnrollmentRequestRepository],
})
export class EnrollmentRequestModule {}
