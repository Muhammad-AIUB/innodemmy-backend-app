import { PartialType } from '@nestjs/swagger';
import { CreateWebinarDto } from './create-webinar.dto';

export class UpdateWebinarDto extends PartialType(CreateWebinarDto) {}
