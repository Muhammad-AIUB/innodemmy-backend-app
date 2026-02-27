import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, UserRole } from '@prisma/client';
import {
  Course,
  CourseListItem,
  CoursesRepository,
} from '../repositories/courses.repository';
import { CourseAnalyticsRepository } from '../repositories/course-analytics.repository';
import { CourseEnrollmentsRepository } from '../repositories/course-enrollments.repository';
import { CourseStudentProgressRepository } from '../repositories/course-student-progress.repository';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { ListCoursesQueryDto } from '../queries/course.query';
import { AdminListCoursesQueryDto } from '../queries/admin-course.query';
import { generateSlug } from '../../../common/utils/slugify';
import { CacheService } from '../../../shared/cache/cache.service';

/** TTL constants (milliseconds) */
const CACHE_LIST_TTL = 5 * 60_000;
const CACHE_ITEM_TTL = 10 * 60_000;
const CACHE_PREFIX = 'courses:';
const ANALYTICS_CACHE_PREFIX = 'course-analytics:';
const ANALYTICS_CACHE_TTL = 60_000;

type PublicCourseResponse = {
  title: string;
  slug: string;
  description: string;
  bannerImage: string;
  price: number;
  discountPrice: number | null;
  duration: number;
  startDate: Date;
  classDays: string;
  classTime: string;
  totalModules: number;
  totalProjects: number;
  totalLive: number;
};

type AdminCourseResponse = PublicCourseResponse & {
  id: string;
  status: CourseStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedCoursesResponse = {
  data: PublicCourseResponse[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type PaginatedAdminCoursesResponse = {
  data: AdminCourseResponse[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
};

export type CourseAnalyticsResponse = {
  enrolledStudents: number;
  startedStudents: number;
  completedStudents: number;
  completionRate: number;
};

export type CourseEnrollmentResponse = {
  userId: string;
  name: string;
  email: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
};

export type StudentCourseProgressLessonResponse = {
  lessonId: string;
  title: string;
  completed: boolean;
};

export type StudentCourseProgressModuleResponse = {
  moduleId: string;
  title: string;
  lessons: StudentCourseProgressLessonResponse[];
};

export type StudentCourseProgressResponse = {
  userId: string;
  name: string;
  email: string;
  modules: StudentCourseProgressModuleResponse[];
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
};

@Injectable()
export class CoursesService {
  private readonly analyticsCache = new Map<
    string,
    { data: CourseAnalyticsResponse; expiresAt: number }
  >();

  constructor(
    private readonly repo: CoursesRepository,
    private readonly analyticsRepo: CourseAnalyticsRepository,
    private readonly enrollmentsRepo: CourseEnrollmentsRepository,
    private readonly studentProgressRepo: CourseStudentProgressRepository,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateCourseDto,
    userId: string,
  ): Promise<AdminCourseResponse> {
    const slug = await this.generateUniqueSlug(dto.title);

    const course = await this.repo.create({
      title: dto.title,
      description: dto.description,
      bannerImage: dto.bannerImage,
      price: dto.price,
      discountPrice: dto.discountPrice,
      duration: dto.duration,
      startDate: new Date(dto.startDate),
      classDays: dto.classDays,
      classTime: dto.classTime,
      totalModules: dto.totalModules,
      totalProjects: dto.totalProjects,
      totalLive: dto.totalLive,
      slug,
      status: CourseStatus.DRAFT,
      createdById: userId,
    });

    // Invalidate public listing caches — a new draft may eventually show up
    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(course);
  }

  /**
   * Admin single-course lookup by ID.
   * ADMIN users can only access their own courses; SUPER_ADMIN can access all.
   */
  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AdminCourseResponse> {
    const course = await this.ensureExistsAndAuthorized(id, userId, userRole);
    return this.mapAdminResponse(course);
  }

  /**
   * Admin listing — returns all non-deleted courses (DRAFT + PUBLISHED).
   * ADMIN users only see their own courses; SUPER_ADMIN sees all.
   */
  async findAll(
    query: AdminListCoursesQueryDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedAdminCoursesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() ?? '';
    const skip = (page - 1) * limit;

    const createdById = userRole === UserRole.SUPER_ADMIN ? undefined : userId;

    const [items, total]: [CourseListItem[], number] = await Promise.all([
      this.repo.findAll({
        skip,
        take: limit,
        search: search || undefined,
        status: query.status,
        createdById,
      }),
      this.repo.countAll({
        search: search || undefined,
        status: query.status,
        createdById,
      }),
    ]);

    return {
      data: items.map((item) => this.mapAdminResponse(item)),
      meta: {
        page,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public listing — results are cached per page/limit/search key.
   * Cache is automatically invalidated on any mutation.
   */
  async findPublished(
    query: ListCoursesQueryDto,
  ): Promise<PaginatedCoursesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() ?? '';
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}public:list:${page}:${limit}:${search}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const [items, total] = await Promise.all([
          this.repo.findPublished({
            skip,
            take: limit,
            search: search || undefined,
          }),
          this.repo.countPublished(search || undefined),
        ]);

        return {
          data: items.map((item) => this.mapPublicResponse(item)),
          meta: {
            page,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          },
        };
      },
      CACHE_LIST_TTL,
    );
  }

  /**
   * Public single-course lookup by slug — cached per slug.
   */
  async findPublishedBySlug(slug: string): Promise<PublicCourseResponse> {
    return this.cache.wrap(
      `${CACHE_PREFIX}public:slug:${slug}`,
      async () => {
        const course = await this.repo.findPublishedBySlug(slug);
        if (!course) {
          throw new NotFoundException('Course not found');
        }
        return this.mapPublicResponse(course);
      },
      CACHE_ITEM_TTL,
    );
  }

  /**
   * Admin preview lookup by slug — bypasses published-only filter.
   * Returns any non-deleted course (DRAFT or PUBLISHED).
   * Caller (controller) is responsible for verifying admin role.
   */
  async findBySlugForPreview(slug: string): Promise<PublicCourseResponse> {
    const course = await this.repo.findBySlug(slug);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return this.mapPublicResponse(course);
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    userId: string,
    userRole: UserRole,
  ): Promise<AdminCourseResponse> {
    const existing = await this.ensureExistsAndAuthorized(id, userId, userRole);

    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      updateData.title = dto.title;
      updateData.slug = await this.generateUniqueSlug(dto.title, existing.id);
    }

    if (
      dto.description !== undefined &&
      dto.description !== existing.description
    ) {
      updateData.description = dto.description;
    }

    if (
      dto.bannerImage !== undefined &&
      dto.bannerImage !== existing.bannerImage
    ) {
      updateData.bannerImage = dto.bannerImage;
    }

    if (dto.price !== undefined && dto.price !== existing.price) {
      updateData.price = dto.price;
    }

    if (
      dto.discountPrice !== undefined &&
      dto.discountPrice !== existing.discountPrice
    ) {
      updateData.discountPrice = dto.discountPrice;
    }

    if (dto.duration !== undefined && dto.duration !== existing.duration) {
      updateData.duration = dto.duration;
    }

    if (dto.startDate !== undefined) {
      const nextDate = new Date(dto.startDate);
      if (nextDate.getTime() !== existing.startDate.getTime()) {
        updateData.startDate = nextDate;
      }
    }

    if (dto.classDays !== undefined && dto.classDays !== existing.classDays) {
      updateData.classDays = dto.classDays;
    }

    if (dto.classTime !== undefined && dto.classTime !== existing.classTime) {
      updateData.classTime = dto.classTime;
    }

    if (
      dto.totalModules !== undefined &&
      dto.totalModules !== existing.totalModules
    ) {
      updateData.totalModules = dto.totalModules;
    }

    if (
      dto.totalProjects !== undefined &&
      dto.totalProjects !== existing.totalProjects
    ) {
      updateData.totalProjects = dto.totalProjects;
    }

    if (dto.totalLive !== undefined && dto.totalLive !== existing.totalLive) {
      updateData.totalLive = dto.totalLive;
    }

    if (Object.keys(updateData).length === 0) {
      return this.mapAdminResponse(existing);
    }

    const updated = await this.repo.update(id, updateData);

    // Blow away all course cache entries (listings + slug cache)
    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(updated);
  }

  async publish(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AdminCourseResponse> {
    const existing = await this.ensureExistsAndAuthorized(id, userId, userRole);

    if (existing.status === CourseStatus.PUBLISHED) {
      return this.mapAdminResponse(existing);
    }

    // Validate required fields before publishing
    const requiredFields: { field: string; label: string }[] = [
      { field: 'bannerImage', label: 'Banner Image' },
      { field: 'startDate', label: 'Start Date' },
      { field: 'classDays', label: 'Class Days' },
      { field: 'classTime', label: 'Class Time' },
      { field: 'totalModules', label: 'Total Modules' },
      { field: 'totalProjects', label: 'Total Projects' },
      { field: 'totalLive', label: 'Total Live Sessions' },
    ];

    const missing: string[] = [];
    for (const { field, label } of requiredFields) {
      const value = (existing as Record<string, unknown>)[field];
      if (value === null || value === undefined || value === '') {
        missing.push(label);
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot publish course. Missing required fields: ${missing.join(', ')}`,
      );
    }

    const published = await this.repo.publish(id);

    this.cache.delByPrefix(CACHE_PREFIX);

    return this.mapAdminResponse(published);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    await this.ensureExistsAndAuthorized(id, userId, userRole);

    await this.repo.softDelete(id);

    this.cache.delByPrefix(CACHE_PREFIX);
  }

  async getCourseAnalytics(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseAnalyticsResponse> {
    await this.ensureExistsAndAuthorized(courseId, userId, userRole);

    const cacheKey = this.buildAnalyticsCacheKey(courseId);
    const cached = this.analyticsCache.get(cacheKey);

    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.data;
      }

      this.analyticsCache.delete(cacheKey);
    }

    const [enrolledStudents, totalLessons, startedStudents] = await Promise.all(
      [
        this.analyticsRepo.getEnrollmentCount(courseId),
        this.analyticsRepo.getTotalLessons(courseId),
        this.analyticsRepo.getStudentsStarted(courseId),
      ],
    );

    const completedStudents = await this.analyticsRepo.getStudentsCompleted(
      courseId,
      totalLessons,
    );

    const completionRate =
      enrolledStudents === 0
        ? 0
        : Math.round((completedStudents / enrolledStudents) * 100);

    const analytics: CourseAnalyticsResponse = {
      enrolledStudents,
      startedStudents,
      completedStudents,
      completionRate,
    };

    this.analyticsCache.set(cacheKey, {
      data: analytics,
      expiresAt: Date.now() + ANALYTICS_CACHE_TTL,
    });

    return analytics;
  }

  async getCourseEnrollments(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseEnrollmentResponse[]> {
    await this.ensureExistsAndAuthorized(courseId, userId, userRole);

    const [activeEnrollments, totalLessons, completedCounts] =
      await Promise.all([
        this.enrollmentsRepo.findActiveCourseEnrollments(courseId),
        this.enrollmentsRepo.countCourseLessons(courseId),
        this.enrollmentsRepo.getCompletedLessonCountsByUser(courseId),
      ]);

    const completedByUser = new Map<string, number>(
      completedCounts.map((row) => [row.userId, row.completedLessons]),
    );

    return activeEnrollments.map((enrollment) => {
      const completedLessons = completedByUser.get(enrollment.userId) ?? 0;
      const progressPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      return {
        userId: enrollment.userId,
        name: enrollment.name ?? '',
        email: enrollment.email,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        completedLessons,
        totalLessons,
        progressPercentage,
      };
    });
  }

  async getStudentCourseProgress(
    courseId: string,
    studentId: string,
    adminUserId: string,
    adminUserRole: UserRole,
  ): Promise<StudentCourseProgressResponse> {
    await this.ensureExistsAndAuthorized(courseId, adminUserId, adminUserRole);

    const enrolledStudent =
      await this.studentProgressRepo.findActiveEnrollmentStudent(
        courseId,
        studentId,
      );

    if (!enrolledStudent) {
      throw new NotFoundException(
        'Active enrollment not found for this student in the course.',
      );
    }

    const [modules, completedLessonIds] = await Promise.all([
      this.studentProgressRepo.findCourseModulesWithLessons(courseId),
      this.studentProgressRepo.findCompletedLessonIdsForUserInCourse(
        courseId,
        studentId,
      ),
    ]);

    const completedLessonIdSet = new Set(completedLessonIds);
    let totalLessons = 0;

    const moduleResponses = modules.map((module) => {
      const lessons = module.lessons.map((lesson) => {
        totalLessons += 1;
        return {
          lessonId: lesson.lessonId,
          title: lesson.title,
          completed: completedLessonIdSet.has(lesson.lessonId),
        };
      });

      return {
        moduleId: module.moduleId,
        title: module.title,
        lessons,
      };
    });

    const completedLessons = completedLessonIds.length;
    const progressPercentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    return {
      userId: enrolledStudent.userId,
      name: enrolledStudent.name ?? '',
      email: enrolledStudent.email,
      modules: moduleResponses,
      completedLessons,
      totalLessons,
      progressPercentage,
    };
  }

  private async ensureExistsAndAuthorized(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.repo.findById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN && course.createdById !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this course',
      );
    }

    return course;
  }

  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = generateSlug(title);
    const conflicts = await this.repo.findSlugConflicts(baseSlug);

    const used = new Set<string>();

    for (const conflict of conflicts) {
      if (excludeId && conflict.id === excludeId) {
        continue;
      }

      used.add(conflict.slug);
    }

    if (!used.has(baseSlug)) {
      return baseSlug;
    }

    let counter = 1;
    let candidate = `${baseSlug}-${counter}`;

    while (used.has(candidate)) {
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }

    return candidate;
  }

  private buildAnalyticsCacheKey(courseId: string): string {
    return `${ANALYTICS_CACHE_PREFIX}${courseId}`;
  }

  /**
   * Accepts both the narrow `CourseListItem` (from listing queries) and
   * the full `Course` object (from admin/detail queries).
   * TypeScript's structural typing ensures both satisfy the parameter.
   */
  private mapPublicResponse(course: CourseListItem): PublicCourseResponse {
    return {
      title: course.title,
      slug: course.slug,
      description: course.description,
      bannerImage: course.bannerImage,
      price: course.price,
      discountPrice: course.discountPrice,
      duration: course.duration,
      startDate: course.startDate,
      classDays: course.classDays,
      classTime: course.classTime,
      totalModules: course.totalModules,
      totalProjects: course.totalProjects,
      totalLive: course.totalLive,
    };
  }

  private mapAdminResponse(course: CourseListItem): AdminCourseResponse {
    return {
      id: course.id,
      ...this.mapPublicResponse(course),
      status: course.status,
      createdById: course.createdById,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
