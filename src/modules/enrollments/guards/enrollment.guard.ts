import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { EnrollmentRepository } from '../repositories/enrollment.repository';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: UserRole };
  params: Record<string, string>;
}
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private readonly enrollmentRepo: EnrollmentRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    // ADMIN and SUPER_ADMIN bypass enrollment check
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const courseId = request.params['courseId'];

    if (!courseId) {
      throw new ForbiddenException(
        'Course ID is required to access this resource.',
      );
    }

    const activeEnrollment = await this.enrollmentRepo.findActiveEnrollment(
      user.sub,
      courseId,
    );

    if (!activeEnrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this course. Please enroll to access this content.',
      );
    }

    return true;
  }
}
