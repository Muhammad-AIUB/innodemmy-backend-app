import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';
import { ProgressController } from './controllers/progress.controller';
import { ProgressService } from './services/progress.service';
import { ProgressRepository } from './repositories/progress.repository';

@Module({
  imports: [PrismaModule, EnrollmentModule],
  controllers: [ProgressController],
  providers: [ProgressService, ProgressRepository],
})
export class ProgressModule {}
