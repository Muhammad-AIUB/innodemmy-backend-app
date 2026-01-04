import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { HealthModule } from './common/health/health.module';
import { EmailProcessor } from './shared/mail/email.processor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres' as const,
          url: configService.getOrThrow<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: false,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('NODE_ENV') === 'development',
          extra: {
            max: 20,
            min: 5,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            maxUses: 7500,
            ssl:
              configService.get<string>('DATABASE_SSL') === 'true'
                ? { rejectUnauthorized: false }
                : false,
          },
        };
      },
      inject: [ConfigService],
    }),

    RedisModule.forRoot({
      config: {
        // Support Redis URL (for Upstash, Redis Cloud, etc.) or host/port
        ...(process.env.REDIS_URL
          ? { url: process.env.REDIS_URL }
          : {
              host: process.env.REDIS_HOST || 'localhost',
              port: +(process.env.REDIS_PORT || 6379),
            }),
        // TLS/SSL for cloud Redis
        ...(process.env.REDIS_TLS === 'true' && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
        // Connection retry for serverless
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      },
    }),

    BullModule.forRoot({
      connection: {
        // Support Redis URL (for Upstash, Redis Cloud, etc.) or host/port
        ...(process.env.REDIS_URL
          ? { url: process.env.REDIS_URL }
          : {
              host: process.env.REDIS_HOST || 'localhost',
              port: +(process.env.REDIS_PORT || 6379),
            }),
        // TLS/SSL for cloud Redis
        ...(process.env.REDIS_TLS === 'true' && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
        maxRetriesPerRequest: 3,
      },
    }),

    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: 587,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
    }),

    AuthModule,
    CoursesModule,
    HealthModule,
  ],
  providers: [
    EmailProcessor,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
