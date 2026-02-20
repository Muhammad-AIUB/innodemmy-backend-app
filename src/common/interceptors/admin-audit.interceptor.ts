import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../shared/prisma/prisma.service';

export const ADMIN_AUDIT_KEY = 'admin_audit';

export interface AdminAuditConfig {
  action: string;
  entity: string;
  /** Route param name that holds the entity ID (e.g. 'id', 'courseId') */
  entityIdParam?: string;
  /** Extract entity ID from response body at this path (e.g. 'data.id') */
  entityIdFromResponse?: string;
}

/**
 * Decorator to mark a route for admin action logging.
 */
import { SetMetadata } from '@nestjs/common';
export const AdminAudit = (config: AdminAuditConfig) =>
  SetMetadata(ADMIN_AUDIT_KEY, config);

/**
 * Interceptor that logs admin actions to the AdminActionLog table.
 * Fire-and-forget: logging failures never block the response.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.get<AdminAuditConfig | undefined>(
      ADMIN_AUDIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string };
      params?: Record<string, string>;
    }>();
    const adminId: string | undefined = request.user?.sub;

    if (!adminId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        let entityId: string | undefined;

        // Try extracting from route params first
        if (config.entityIdParam) {
          entityId = request.params?.[config.entityIdParam];
        }

        // If not in params, try from response body
        if (!entityId && config.entityIdFromResponse && responseBody) {
          entityId = this.extractNestedValue(
            responseBody,
            config.entityIdFromResponse,
          );
        }

        if (!entityId) {
          entityId = 'unknown';
        }

        // Fire-and-forget
        void this.log(adminId, config.action, config.entity, entityId);
      }),
    );
  }

  private extractNestedValue(obj: unknown, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : undefined;
  }

  private async log(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
  ): Promise<void> {
    try {
      await this.prisma.adminActionLog.create({
        data: { adminId, action, entity, entityId },
      });
      this.logger.log(
        `[ADMIN_ACTION] admin=${adminId} action=${action} entity=${entity} entityId=${entityId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to log admin action: ${(err as Error).message}`,
      );
    }
  }
}
