import { Module } from '@nestjs/common';
import {
  CoursesPublicController,
  CoursesAdminController,
} from './controller/courses.controller';
import { CourseAnalyticsController } from './controller/course-analytics.controller';
import { CoursesService } from './services/courses.service';
import { CoursesRepository } from './repositories/courses.repository';
import { CourseAnalyticsRepository } from './repositories/course-analytics.repository';
import { CourseEnrollmentsRepository } from './repositories/course-enrollments.repository';

@Module({
  controllers: [
    CoursesPublicController,
    CoursesAdminController,
    CourseAnalyticsController,
  ],
  providers: [
    CoursesService,
    CoursesRepository,
    CourseAnalyticsRepository,
    CourseEnrollmentsRepository,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
