import { Injectable, NotFoundException } from '@nestjs/common';
import { WebinarsRepository } from './webinars.repository';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';

@Injectable()
export class WebinarsService {
  constructor(private readonly repo: WebinarsRepository) {}

  async create(dto: CreateWebinarDto) {
    return this.repo.create(dto);
  }

  async findAll(skip?: number, take?: number) {
    return this.repo.findAll({ skip, take });
  }

  async findOne(identifier: string) {
    const byId = await this.repo.findOneById(identifier);
    if (byId) return byId;
    const bySlug = await this.repo.findOneBySlug(identifier);
    if (bySlug) return bySlug;
    throw new NotFoundException('Webinar not found');
  }

  async update(id: string, dto: UpdateWebinarDto) {
    await this.ensureExists(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.repo.remove(id);
  }

  private async ensureExists(id: string) {
    const w = await this.repo.findOneById(id);
    if (!w) throw new NotFoundException('Webinar not found');
    return w;
  }
}
