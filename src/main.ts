import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: true }),
    );

    // Fastify is used as the HTTP engine

    await app.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      ban: 10,
      keyGenerator: (req) => req.ip ?? req.headers['x-forwarded-for'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Strict CORS configuration for production
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    console.log('✅ CORS enabled');

    // Production hook for Prisma beforeExit
    if (process.env.NODE_ENV === 'production') {
      process.on('beforeExit', () => {
        app.close().catch((err) => console.error('Error closing app:', err));
      });
    }

    // Setup Swagger documentation
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Webinar API')
      .setDescription('Webinar management service')
      .setVersion('1.0')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      try {
        await app.close();
        console.log('✅ Application closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    console.log(`🚀 Starting server on ${host}:${port}...`);
    try {
      await app.listen(port, host);
      console.log(`✅ Application is running on: http://${host}:${port}`);
      console.log(`✅ Swagger Docs: http://${host}:${port}/api`);
      console.log(`✅ Health Check: http://${host}:${port}/health`);
    } catch (listenError: unknown) {
      if (
        listenError &&
        typeof listenError === 'object' &&
        'code' in listenError &&
        listenError.code === 'EADDRINUSE'
      ) {
        console.error(
          `❌ Port ${port} is already in use. Please:\n` +
            `   1. Kill the process using port ${port}: netstat -ano | findstr :${port}\n` +
            `   2. Or use a different port: PORT=3001 pnpm run start:dev\n` +
            `   3. Or restart your terminal/IDE`,
        );
      } else {
        console.error('❌ Error starting server:', listenError);
      }
      throw listenError;
    }
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}
void bootstrap();
