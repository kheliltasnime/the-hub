import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppException } from '../app.exception';

export const ROLES_KEY = 'roles';

// Usage sur une route : @Roles(Role.super_admin, Role.manager_coworking)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// À utiliser APRÈS JwtAuthGuard dans @UseGuards() car il lit req.user.role
// (rempli par le guard JWT au moment de la validation du token)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new AppException(
        'FORBIDDEN_ROLE',
        "Vous n'avez pas les droits nécessaires pour cette action",
        403,
      );
    }

    return true;
  }
}