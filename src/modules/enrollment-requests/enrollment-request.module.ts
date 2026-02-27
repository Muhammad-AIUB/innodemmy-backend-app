import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';
import {
  EnrollmentRequestStudentController,
  EnrollmentRequestAdminController,
} from './controllers/enrollment-request.controller';
import { EnrollmentRequestService } from './services/enrollment-request.service';
import { EnrollmentRequestRepository } from './repositories/enrollment-request.repository';

@Module({
  imports: [PrismaModule, EnrollmentModule],
  controllers: [
    EnrollmentRequestStudentController,
    EnrollmentRequestAdminController,
  ],
  providers: [EnrollmentRequestService, EnrollmentRequestRepository],
})
export class EnrollmentRequestModule {}
