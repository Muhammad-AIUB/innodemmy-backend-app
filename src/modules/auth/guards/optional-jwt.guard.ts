import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — populates `req.user` when a valid token is present
 * but does NOT reject unauthenticated requests.
 *
 * Use this on public endpoints that need to optionally inspect the
 * caller's identity (e.g. admin preview mode).
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Override: instead of throwing on missing/invalid token,
   * return `undefined` so the request continues unauthenticated.
   */
  handleRequest<TUser = any>(err: any, user: TUser): TUser | undefined {
    if (err || !user) {
      return undefined as unknown as TUser;
    }
    return user;
  }
}
