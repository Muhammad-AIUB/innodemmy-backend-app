import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: true }),
    );

    // Basic rate limiting
    await app.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      ban: 10,
      keyGenerator: (req) => req.ip ?? req.headers['x-forwarded-for'],
    });

    // Global Pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors();
    console.log('✅ CORS enabled');

    // Swagger setup - disabled for Fastify compatibility
    // Uncomment after server starts successfully
    // try {
    //   setupSwagger(app);
    //   console.log('✅ Swagger setup complete');
    // } catch (swaggerError) {
    //   console.warn('⚠️ Swagger setup error (continuing anyway):', swaggerError);
    // }

    console.log('🚀 Starting server on port 3000...');
    try {
      await app.listen(3000, '0.0.0.0');
      console.log('✅ Application is running on: http://0.0.0.0:3000');
      console.log('✅ Swagger Docs: http://0.0.0.0:3000/api');
    } catch (listenError) {
      console.error('❌ Error starting server:', listenError);
      throw listenError;
    }
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}
void bootstrap();
