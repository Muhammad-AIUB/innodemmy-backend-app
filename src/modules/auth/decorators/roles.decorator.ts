import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict a route to users with specific roles.
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Get('admin-only')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
