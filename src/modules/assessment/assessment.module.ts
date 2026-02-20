import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';
import { NotificationModule } from '../notification/notification.module';

// Quiz domain
import { QuizController } from './quiz/controllers/quiz.controller';
import { QuizService } from './quiz/services/quiz.service';
import { QuizRepository } from './quiz/repositories/quiz.repository';

// Assignment domain
import { AssignmentController } from './assignment/controllers/assignment.controller';
import { AssignmentService } from './assignment/services/assignment.service';
import { AssignmentRepository } from './assignment/repositories/assignment.repository';

@Module({
  imports: [PrismaModule, EnrollmentModule, NotificationModule],
  controllers: [QuizController, AssignmentController],
  providers: [
    QuizService,
    QuizRepository,
    AssignmentService,
    AssignmentRepository,
  ],
})
export class AssessmentModule {}
