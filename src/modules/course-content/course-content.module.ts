import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';

// Modules domain
import { ModulesController } from './modules/controllers/modules.controller';
import { ModulesService } from './modules/services/modules.service';
import { ModulesRepository } from './modules/repositories/modules.repository';

// Lessons domain
import { LessonsController } from './lessons/controllers/lessons.controller';
import { LessonsService } from './lessons/services/lessons.service';
import { LessonsRepository } from './lessons/repositories/lessons.repository';

@Module({
  imports: [PrismaModule, EnrollmentModule],
  controllers: [ModulesController, LessonsController],
  providers: [
    ModulesService,
    ModulesRepository,
    LessonsService,
    LessonsRepository,
  ],
})
export class CourseContentModule {}
