import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CacheModule } from './shared/cache/cache.module';
import { MailModule } from './shared/mail/mail.module';
import { WebinarsModule } from './modules/webinars/webinars.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EnrollmentModule } from './modules/enrollments/enrollment.module';
import { CourseContentModule } from './modules/course-content/course-content.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { BackupModule } from './modules/backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule,
    MailModule,
    AuthModule,
    WebinarsModule,
    BlogsModule,
    CoursesModule,
    EnrollmentModule,
    CourseContentModule,
    AssessmentModule,
    NotificationModule,
    PaymentModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
