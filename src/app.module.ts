import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { WebinarsModule } from './modules/webinars/webinars.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EnrollmentModule } from './modules/enrollments/enrollment.module';
import { CourseContentModule } from './modules/course-content/course-content.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WebinarsModule,
    BlogsModule,
    CoursesModule,
    EnrollmentModule,
    CourseContentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
