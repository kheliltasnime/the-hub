import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AppException } from '../common/app.exception';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ADMIN_ASSIGNABLE_ROLES } from './dto/create-admin-account.dto';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_COOKIE_NAME = 'admin_refresh_token';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async adminLogin(dto: AdminLoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !ADMIN_ASSIGNABLE_ROLES.includes(user.role as (typeof ADMIN_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
    }

    if (!user.isActive) {
      throw new AppException('ACCOUNT_SUSPENDED', 'Ce compte a été désactivé', 403);
    }

    const passwordMatches = user.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!passwordMatches) {
      throw new AppException('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.redis.storeRefreshTokenHash(user.id, refreshToken);

    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // Renouvelle l'access token à partir du refresh token (cookie httpOnly).
  // Rotation du refresh token à chaque appel : réduit la fenêtre d'exploitation
  // si le cookie venait à fuiter.
  async adminRefresh(refreshTokenFromCookie: string | undefined, res: Response) {
    if (!refreshTokenFromCookie) {
      throw new AppException('REFRESH_TOKEN_MISSING', 'Refresh token manquant', 401);
    }

    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(refreshTokenFromCookie, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new AppException('INVALID_REFRESH_TOKEN', 'Refresh token invalide ou expiré', 401);
    }

    const isValid = await this.redis.isRefreshTokenValid(payload.sub, refreshTokenFromCookie);
    if (!isValid) {
      throw new AppException('INVALID_REFRESH_TOKEN', 'Refresh token invalide ou révoqué', 401);
    }

    // Un refresh token émis avant une désactivation ou un changement de rôle
    // ne doit pas rester exploitable — on revérifie l'état actuel en base.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !ADMIN_ASSIGNABLE_ROLES.includes(user.role as (typeof ADMIN_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('INVALID_CREDENTIALS', 'Compte introuvable ou non autorisé', 401);
    }
    if (!user.isActive) {
      throw new AppException('ACCOUNT_SUSPENDED', 'Ce compte a été désactivé', 403);
    }

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(newPayload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });

    const newRefreshToken = await this.jwt.signAsync(newPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    await this.redis.storeRefreshTokenHash(user.id, newRefreshToken);
    this.setRefreshCookie(res, newRefreshToken);

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: { userId: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  async adminLogout(userId: string, res: Response) {
    await this.redis.revokeRefreshToken(userId);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/admin' });
    return { message: 'Déconnexion réussie' };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }
}