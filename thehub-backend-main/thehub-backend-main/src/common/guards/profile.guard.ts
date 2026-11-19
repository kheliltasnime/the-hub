import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppException } from '../app.exception';

@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de @Roles() sur la route => pas de restriction supplémentaire
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userRole: Role | undefined = request.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new AppException(
        'FORBIDDEN',
        "Vous n'avez pas les droits nécessaires pour cette action",
        403,
      );
    }

    return true;
  }
}