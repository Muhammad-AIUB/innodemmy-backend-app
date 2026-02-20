import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Models that have an `isDeleted` flag and should be auto-filtered */
const SOFT_DELETE_MODELS = ['Course', 'Blog', 'Webinar'];

/** Operations where the soft-delete filter should be injected */
const FILTERED_ACTIONS = [
  'findFirst',
  'findMany',
  'findUnique',
  'findFirstOrThrow',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  private _directClient: PrismaClient | null = null;

  constructor() {
    // Pass the pooled URL explicitly so we always use the right endpoint
    // even if Prisma's env-resolution would pick a different one.
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
      // Reduce noise in production; show warnings in development.
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  get direct(): PrismaClient {
    const url = process.env.DATABASE_URL_UNPOOLED;
    if (!url) {
      // Not configured — pooled client is the only option.
      return this;
    }
    if (!this._directClient) {
      this._directClient = new PrismaClient({
        datasources: { db: { url } },
        log: ['error'],
      });
    }
    return this._directClient;
  }

  async onModuleInit() {
    this.registerSoftDeleteMiddleware();
    await this.$connect();
    this.logger.log('Database connected (pooled)');

    if (process.env.DATABASE_URL_UNPOOLED) {
      this.logger.log(
        'DATABASE_URL_UNPOOLED detected — direct client available via prisma.direct',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this._directClient) {
      await this._directClient.$disconnect();
    }
  }
  private registerSoftDeleteMiddleware(): void {
    type QueryArgs = { where?: Record<string, unknown>; [k: string]: unknown };

    this.$use(async (params, next) => {
      if (
        params.model &&
        SOFT_DELETE_MODELS.includes(params.model) &&
        FILTERED_ACTIONS.includes(params.action)
      ) {
        // For findUnique / findUniqueOrThrow, convert to findFirst
        // because we need to add the isDeleted filter alongside unique fields.
        if (
          params.action === 'findUnique' ||
          params.action === 'findUniqueOrThrow'
        ) {
          const targetAction =
            params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';

          const currentArgs = (params.args ?? {}) as QueryArgs;
          const currentWhere = currentArgs.where ?? {};

          params.action = targetAction;
          params.args = {
            ...currentArgs,
            where: {
              ...currentWhere,
              isDeleted: currentWhere.isDeleted ?? false,
            },
          };
        } else {
          // findFirst, findMany, count, aggregate, groupBy
          const currentArgs = (params.args ?? {}) as QueryArgs;
          const currentWhere = currentArgs.where ?? {};

          // Only inject if isDeleted is not already explicitly set.
          if (currentWhere.isDeleted === undefined) {
            currentWhere.isDeleted = false;
          }

          params.args = { ...currentArgs, where: currentWhere };
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return next(params);
    });

    this.logger.log(
      `Soft-delete middleware registered for: ${SOFT_DELETE_MODELS.join(', ')}`,
    );
  }
}
