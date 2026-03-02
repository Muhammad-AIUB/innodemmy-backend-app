import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      activeEnrollments,
      totalBlogs,
      publishedBlogs,
      totalWebinars,
      publishedWebinars,
      totalWebinarRegistrations,
      pendingEnrollmentRequests,
      approvedEnrollmentRequests,
      rejectedEnrollmentRequests,
      totalLessons,
      totalModules,
      recentUsers,
      recentEnrollments,
    ] = await Promise.all([
      // User counts
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', isDeleted: false },
      }),
      this.prisma.user.count({
        where: { role: 'ADMIN', isDeleted: false },
      }),

      // Course counts
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.course.count({ where: { status: 'DRAFT' } }),

      // Enrollment counts
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),

      // Blog counts
      this.prisma.blog.count(),
      this.prisma.blog.count({ where: { status: 'PUBLISHED' } }),

      // Webinar counts
      this.prisma.webinar.count(),
      this.prisma.webinar.count({ where: { status: 'PUBLISHED' } }),

      // Webinar registration count
      this.prisma.webinarRegistration.count(),

      // Enrollment request counts
      this.prisma.enrollmentRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.enrollmentRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.enrollmentRequest.count({ where: { status: 'REJECTED' } }),

      // Content counts
      this.prisma.lesson.count(),
      this.prisma.courseModule.count(),

      // Recent users (last 5)
      this.prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent enrollments (last 5)
      this.prisma.enrollment.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        admins: totalAdmins,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
      },
      blogs: {
        total: totalBlogs,
        published: publishedBlogs,
      },
      webinars: {
        total: totalWebinars,
        published: publishedWebinars,
        registrations: totalWebinarRegistrations,
      },
      enrollmentRequests: {
        pending: pendingEnrollmentRequests,
        approved: approvedEnrollmentRequests,
        rejected: rejectedEnrollmentRequests,
      },
      content: {
        modules: totalModules,
        lessons: totalLessons,
      },
      recentUsers,
      recentEnrollments,
    };
  }
}
