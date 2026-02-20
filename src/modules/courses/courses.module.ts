import { Module } from '@nestjs/common';
import {
  CoursesPublicController,
  CoursesAdminController,
} from './controller/courses.controller';
import { CoursesService } from './services/courses.service';
import { CoursesRepository } from './repositories/courses.repository';

@Module({
  controllers: [CoursesPublicController, CoursesAdminController],
  providers: [CoursesService, CoursesRepository],
  exports: [CoursesService],
})
export class CoursesModule {}
