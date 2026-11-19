import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../app.exception';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppException('UNAUTHORIZED', 'Token manquant', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = await this.jwt.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new AppException('UNAUTHORIZED', 'Token invalide ou expiré', 401);
    }
  }
}