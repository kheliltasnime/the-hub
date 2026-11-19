import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';

export const COWORKING_ROLES_KEY = 'coworking_roles';

// Usage sur une route : @CoworkingRoles(Role.manager_coworking, Role.super_admin)
export const CoworkingRoles = (...roles: Role[]) => SetMetadata(COWORKING_ROLES_KEY, roles);

// Doit être utilisé APRÈS JwtAuthGuard dans @UseGuards() car il lit req.user.role
// (rempli par la stratégie JWT au moment de la validation du token)
@Injectable()
export class CoworkingRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(COWORKING_ROLES_KEY, [
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