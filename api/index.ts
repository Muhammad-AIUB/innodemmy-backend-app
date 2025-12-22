import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '../src/config/swagger';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: NestFastifyApplication;
let fastifyInstance: any;

async function createApp() {
  if (app) {
    return { app, fastifyInstance };
  }

  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // Disable logger in serverless
    }),
  );

  // Decorate Fastify reply with Express-compatible methods for Passport compatibility
  fastifyInstance = app.getHttpAdapter().getInstance();

  // Add Express-compatible methods to Fastify reply
  fastifyInstance.decorateReply(
    'setHeader',
    function (name: string, value: unknown) {
      this.header(name, value);
      return this;
    },
  );
  fastifyInstance.decorateReply('end', function () {
    this.send('');
    return this;
  });

  // Attach response to request object (Express-style) for Passport compatibility
  fastifyInstance.addHook('onRequest', async (request: any, reply: any) => {
    // Attach reply to request as 'res' (Express-style) for Passport
    (request as unknown as { res: typeof reply }).res = reply;
  });

  // Note: Rate limiting disabled for Vercel (handled by Vercel's edge network)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration for Vercel
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

  // Setup Swagger documentation
  setupSwagger(app);

  await app.init();
  await fastifyInstance.ready();

  return { app, fastifyInstance };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { fastifyInstance: instance } = await createApp();

  // Vercel provides Node.js-compatible IncomingMessage and ServerResponse
  // Fastify can handle these directly via its HTTP server
  instance.server.emit('request', req, res);
}

