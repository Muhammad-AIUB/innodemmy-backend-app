import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../modules/auth/entities/user.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL') || process.env.DATABASE_URL,
  entities: [User],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
