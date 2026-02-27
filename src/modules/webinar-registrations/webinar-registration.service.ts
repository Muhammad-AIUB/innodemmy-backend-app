import { ConflictException, Injectable } from '@nestjs/common';
import { WebinarRegistration } from '@prisma/client';
import { WebinarRegistrationRepository } from './webinar-registration.repository';
import { CreateWebinarRegistrationDto } from './dto/create-webinar-registration.dto';

@Injectable()
export class WebinarRegistrationService {
  constructor(private readonly repo: WebinarRegistrationRepository) {}

  async register(
    dto: CreateWebinarRegistrationDto,
  ): Promise<WebinarRegistration> {
    const existing = await this.repo.findByWebinarAndEmail(
      dto.webinarId,
      dto.email,
    );

    if (existing) {
      throw new ConflictException(
        'You have already registered for this webinar',
      );
    }

    return this.repo.create({
      webinarId: dto.webinarId,
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
    });
  }

  async findAllByWebinar(webinarId: string): Promise<WebinarRegistration[]> {
    return this.repo.findAllByWebinar(webinarId);
  }
}
