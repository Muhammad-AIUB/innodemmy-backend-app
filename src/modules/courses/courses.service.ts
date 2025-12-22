import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    try {
      const course = this.courseRepository.create(createCourseDto);
      return await this.courseRepository.save(course);
    } catch (error) {
      throw new BadRequestException(
        'Failed to create course: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  async findAll(): Promise<Course[]> {
    return await this.courseRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    Object.assign(course, updateCourseDto);

    try {
      return await this.courseRepository.save(course);
    } catch (error) {
      throw new BadRequestException(
        'Failed to update course: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);

    try {
      await this.courseRepository.remove(course);
    } catch (error) {
      throw new BadRequestException(
        'Failed to delete course: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }
}

