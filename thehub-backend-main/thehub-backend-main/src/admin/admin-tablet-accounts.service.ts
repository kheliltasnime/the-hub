import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateTabletAccountDto, TABLET_ASSIGNABLE_ROLES } from './dto/create-tablet-account.dto';
import { UpdateTabletPinDto } from './dto/update-tablet-pin.dto';
import { UnlockTabletAccountDto } from './dto/unlock-tablet-account.dto';

const TABLET_SELECT = {
  id: true,
  fullName: true,
  role: true,
  deviceId: true,
  enseigneId: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const EXPECTED_PIN_LENGTH: Partial<Record<Role, number>> = {
  [Role.kds_chef]: 4,
  [Role.kds_equipier]: 4,
  [Role.pos_caissier]: 6,
};

@Injectable()
export class AdminTabletAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTabletAccounts() {
    return this.prisma.user.findMany({
      where: { role: { in: [...TABLET_ASSIGNABLE_ROLES] } },
      select: TABLET_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTabletAccount(actorId: string, dto: CreateTabletAccountDto) {
    const existingDevice = await this.prisma.user.findUnique({ where: { deviceId: dto.deviceId } });
    if (existingDevice) {
      throw new AppException('DEVICE_ALREADY_ASSIGNED', 'Ce deviceId est déjà assigné à un autre compte', 409);
    }

    if (dto.role === Role.kds_chef && !dto.email) {
      throw new AppException('EMAIL_REQUIRED', 'email est requis pour le rôle kds_chef', 400);
    }
    if ((dto.role === Role.kds_chef || dto.role === Role.kds_equipier) && !dto.enseigneId) {
      throw new AppException('ENSEIGNE_REQUIRED', 'enseigneId est requis pour les rôles KDS', 400);
    }

    const expectedLength = EXPECTED_PIN_LENGTH[dto.role];
    if (dto.pin.length !== expectedLength) {
      throw new AppException(
        'INVALID_PIN_LENGTH',
        `Le PIN doit contenir ${expectedLength} chiffres pour le rôle ${dto.role}`,
        400,
      );
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail) {
        throw new AppException('EMAIL_ALREADY_EXISTS', 'Un compte existe déjà avec cet email', 409);
      }
    }

    // Évite l'ambiguïté à la connexion : deux comptes actifs de la même enseigne
    // ne doivent pas partager le même PIN.
    await this.assertNoPinCollision(dto.pin, dto.enseigneId ?? null);

    const pinHash = await bcrypt.hash(dto.pin, 10);
    const email = dto.email ?? `${dto.deviceId}@tablette.thehubghazela.tn`;

    const account = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName,
        profileType: 'professionnel',
        role: dto.role,
        pinHash,
        deviceId: dto.deviceId,
        enseigneId: dto.enseigneId,
        emailVerified: true,
      },
      select: TABLET_SELECT,
    });

    await this.writeAuditLog(
      actorId,
      'TABLET_ACCOUNT_CREATED',
      account.id,
      `Création compte ${dto.role} — tablette ${dto.deviceId}`,
      { role: dto.role, deviceId: dto.deviceId },
    );

    return account;
  }

  // Modification du PIN — §7.3 pattern (action admin sur un compte)
  async updateTabletPin(actorId: string, id: string, dto: UpdateTabletPinDto) {
    const account = await this.prisma.user.findUnique({ where: { id } });
    if (!account || !TABLET_ASSIGNABLE_ROLES.includes(account.role as (typeof TABLET_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('TABLET_ACCOUNT_NOT_FOUND', 'Compte tablette introuvable', 404);
    }

    const expectedLength = EXPECTED_PIN_LENGTH[account.role];
    if (dto.pin.length !== expectedLength) {
      throw new AppException(
        'INVALID_PIN_LENGTH',
        `Le PIN doit contenir ${expectedLength} chiffres pour le rôle ${account.role}`,
        400,
      );
    }

    await this.assertNoPinCollision(dto.pin, account.enseigneId, account.id);

    const pinHash = await bcrypt.hash(dto.pin, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        pinHash,
        // Changer le PIN réinitialise tout verrouillage/compteur d'échecs en cours.
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
      select: TABLET_SELECT,
    });

    await this.writeAuditLog(actorId, 'TABLET_PIN_UPDATED', id, 'Changement du PIN du compte tablette');

    return updated;
  }

  // Déblocage manuel par un manager — §8.1 ("déblocage par manager ou après 15 min")
  async unlockTabletAccount(actorId: string, id: string, dto: UnlockTabletAccountDto) {
    const account = await this.prisma.user.findUnique({ where: { id }, select: TABLET_SELECT });
    if (!account || !TABLET_ASSIGNABLE_ROLES.includes(account.role as (typeof TABLET_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('TABLET_ACCOUNT_NOT_FOUND', 'Compte tablette introuvable', 404);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
      select: TABLET_SELECT,
    });

    await this.writeAuditLog(actorId, 'TABLET_ACCOUNT_UNLOCKED', id, dto.reason);

    return updated;
  }

  async deactivateTabletAccount(actorId: string, id: string) {
    const account = await this.prisma.user.findUnique({ where: { id }, select: TABLET_SELECT });
    if (!account || !TABLET_ASSIGNABLE_ROLES.includes(account.role as (typeof TABLET_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('TABLET_ACCOUNT_NOT_FOUND', 'Compte tablette introuvable', 404);
    }
    if (!account.isActive) {
      throw new AppException('TABLET_ACCOUNT_ALREADY_INACTIVE', 'Ce compte est déjà désactivé', 409);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: TABLET_SELECT,
    });

    await this.writeAuditLog(actorId, 'TABLET_ACCOUNT_DEACTIVATED', id, 'Désactivation du compte tablette (perte/vol/départ)');

    return updated;
  }

  // Compare le PIN en clair aux hashs bcrypt des comptes actifs de la même enseigne
  // (impossible de comparer des hashs bcrypt directement, chaque hash a son propre sel).
  private async assertNoPinCollision(pin: string, enseigneId: string | null, excludeAccountId?: string) {
    const candidates = await this.prisma.user.findMany({
      where: {
        role: { in: [...TABLET_ASSIGNABLE_ROLES] },
        isActive: true,
        enseigneId,
        ...(excludeAccountId && { id: { not: excludeAccountId } }),
      },
      select: { id: true, pinHash: true },
    });

    for (const candidate of candidates) {
      if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
        throw new AppException(
          'PIN_ALREADY_USED',
          'Ce PIN est déjà utilisé par un autre compte de cette enseigne — choisissez-en un autre',
          409,
        );
      }
    }
  }

  private async writeAuditLog(
    actorId: string,
    action: string,
    targetId: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        targetType: 'User',
        targetId,
        reason,
        ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }
}