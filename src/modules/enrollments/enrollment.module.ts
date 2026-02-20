import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentController } from './controllers/enrollment.controller';
import { EnrollmentService } from './services/enrollment.service';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { EnrollmentGuard } from './guards/enrollment.guard';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentRepository, EnrollmentGuard],
  exports: [EnrollmentRepository, EnrollmentGuard],
})
export class EnrollmentModule {}
