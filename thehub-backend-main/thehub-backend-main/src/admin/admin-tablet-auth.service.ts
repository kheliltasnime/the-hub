import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { TabletLoginDto } from './dto/tablet-login.dto';
import { TABLET_ASSIGNABLE_ROLES } from './dto/create-tablet-account.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min — §8.1 CDC technique
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — session tablette (§5.1 CDC technique)

@Injectable()
export class AdminTabletAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async tabletLogin(dto: TabletLoginDto) {
    const account = await this.prisma.user.findUnique({ where: { deviceId: dto.deviceId } });

    if (!account || !TABLET_ASSIGNABLE_ROLES.includes(account.role as (typeof TABLET_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('INVALID_CREDENTIALS', 'Identifiants tablette incorrects', 401);
    }

    if (!account.isActive) {
      throw new AppException('ACCOUNT_SUSPENDED', 'Ce compte tablette a été désactivé', 403);
    }

    // kds_chef se connecte par email + PIN — les autres rôles par PIN + deviceId seuls.
    if (account.role === Role.kds_chef && account.email !== dto.email) {
      throw new AppException('INVALID_CREDENTIALS', 'Identifiants tablette incorrects', 401);
    }

    if (account.pinLockedUntil && account.pinLockedUntil > new Date()) {
      const remainingMin = Math.ceil((account.pinLockedUntil.getTime() - Date.now()) / 60000);
      throw new AppException(
        'DEVICE_LOCKED',
        `Trop de tentatives échouées. Réessayez dans ${remainingMin} min ou contactez un manager.`,
        423,
      );
    }

    const pinMatches = account.pinHash ? await bcrypt.compare(dto.pin, account.pinHash) : false;

    if (!pinMatches) {
      await this.registerFailedAttempt(account.id, account.pinFailedAttempts);
      throw new AppException('INVALID_CREDENTIALS', 'Identifiants tablette incorrects', 401);
    }

    if (account.pinFailedAttempts > 0 || account.pinLockedUntil) {
      await this.prisma.user.update({
        where: { id: account.id },
        data: { pinFailedAttempts: 0, pinLockedUntil: null },
      });
    }

    const payload = {
      sub: account.id,
      role: account.role,
      deviceId: account.deviceId,
      enseigneId: account.enseigneId,
    };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: SESSION_TTL_SECONDS });

    return {
      accessToken,
      expiresIn: SESSION_TTL_SECONDS,
      user: {
        userId: account.id,
        fullName: account.fullName,
        role: account.role,
        enseigneId: account.enseigneId,
      },
    };
  }

  private async registerFailedAttempt(accountId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: accountId },
      data: {
        pinFailedAttempts: shouldLock ? 0 : attempts,
        pinLockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
  }
}