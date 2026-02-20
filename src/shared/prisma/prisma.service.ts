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

  async onModuleInit() {
    this.registerSoftDeleteMiddleware();
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Automatically injects `isDeleted: false` into read queries
   * for Course, Blog, and Webinar models.
   *
   * This prevents accidentally fetching soft-deleted records
   * without having to remember the filter in every query.
   */
  private registerSoftDeleteMiddleware(): void {
    type QueryArgs = { where?: Record<string, unknown>; [k: string]: unknown };

    this.$use(async (params, next) => {
      if (
        params.model &&
        SOFT_DELETE_MODELS.includes(params.model) &&
        FILTERED_ACTIONS.includes(params.action)
      ) {
        // For findUnique / findUniqueOrThrow, convert to findFirst
        // because we need to add the isDeleted filter alongside unique fields
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

          // Only inject if isDeleted is not already explicitly set
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
