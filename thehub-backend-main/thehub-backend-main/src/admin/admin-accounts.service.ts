import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateAdminAccountDto, ADMIN_ASSIGNABLE_ROLES } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { DeactivateAdminAccountDto } from './dto/deactivate-admin-account.dto';
import { GetAdminAccountsDto } from './dto/get-admin-accounts.dto';

const ADMIN_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts(filters: GetAdminAccountsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      role: filters.role ? filters.role : { in: [...ADMIN_ASSIGNABLE_ROLES] },
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.search && {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [accounts, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      accounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAccountById(id: string) {
    const account = await this.prisma.user.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!account || !ADMIN_ASSIGNABLE_ROLES.includes(account.role as (typeof ADMIN_ASSIGNABLE_ROLES)[number])) {
      throw new AppException('ADMIN_ACCOUNT_NOT_FOUND', 'Compte admin introuvable', 404);
    }
    return account;
  }

  async createAccount(actorId: string, dto: CreateAdminAccountDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new AppException('EMAIL_ALREADY_EXISTS', 'Un compte existe déjà avec cet email', 409);
    }

    const generatedPassword = dto.password ?? randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const account = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
        profileType: 'professionnel',
        emailVerified: true,
      },
      select: ADMIN_SELECT,
    });

    if (!dto.password) {
      // TODO: envoyer ce mot de passe temporaire par email une fois le service email branché
      console.log(`[DEV] Mot de passe temporaire pour ${dto.email} : ${generatedPassword}`);
    }

    await this.writeAuditLog(actorId, 'ADMIN_ACCOUNT_CREATED', account.id, `Création du compte ${dto.email} (${dto.role})`, {
      role: dto.role,
    });

    return account;
  }

  async updateAccount(actorId: string, id: string, dto: UpdateAdminAccountDto) {
    await this.getAccountById(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
      },
      select: ADMIN_SELECT,
    });

    await this.writeAuditLog(actorId, 'ADMIN_ACCOUNT_UPDATED', id, 'Modification des informations du compte');

    return updated;
  }

  async updateAccountRole(actorId: string, id: string, dto: UpdateAdminRoleDto) {
    const account = await this.getAccountById(id);

    // Rétrograder le dernier Super Admin actif (ou se rétrograder soi-même) bloquerait
    // l'accès total au backoffice — garde-fou de bon sens, non explicitement dans le CDC.
    if (account.role === Role.super_admin && dto.role !== Role.super_admin) {
      if (actorId === id) {
        throw new AppException(
          'SELF_ROLE_DOWNGRADE_FORBIDDEN',
          'Un Super Admin ne peut pas rétrograder son propre rôle — demandez à un autre Super Admin',
          403,
        );
      }
      await this.assertNotLastActiveSuperAdmin(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: ADMIN_SELECT,
    });

    await this.writeAuditLog(
      actorId,
      'ADMIN_ROLE_UPDATED',
      id,
      `Rôle changé de ${account.role} vers ${dto.role}`,
      { previousRole: account.role, newRole: dto.role },
    );

    return updated;
  }

  async deactivateAccount(actorId: string, id: string, dto: DeactivateAdminAccountDto) {
    const account = await this.getAccountById(id);
    if (!account.isActive) {
      throw new AppException('ADMIN_ACCOUNT_ALREADY_INACTIVE', 'Ce compte est déjà désactivé', 409);
    }

    // Un admin ne peut pas se désactiver lui-même (risque de se bloquer immédiatement
    // hors du backoffice — pas de session pour se réactiver après coup).
    if (actorId === id) {
      throw new AppException(
        'SELF_DEACTIVATION_FORBIDDEN',
        'Vous ne pouvez pas désactiver votre propre compte — demandez à un autre admin',
        403,
      );
    }

    if (account.role === Role.super_admin) {
      await this.assertNotLastActiveSuperAdmin(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: ADMIN_SELECT,
    });

    await this.writeAuditLog(actorId, 'ADMIN_ACCOUNT_DEACTIVATED', id, dto.reason);

    return updated;
  }

  async reactivateAccount(actorId: string, id: string) {
    const account = await this.getAccountById(id);
    if (account.isActive) {
      throw new AppException('ADMIN_ACCOUNT_ALREADY_ACTIVE', 'Ce compte est déjà actif', 409);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: ADMIN_SELECT,
    });

    await this.writeAuditLog(actorId, 'ADMIN_ACCOUNT_REACTIVATED', id, 'Réactivation du compte');

    return updated;
  }

  // Vérifie qu'il restera au moins un Super Admin actif après désactivation/rétrogradation de `excludeId`.
  private async assertNotLastActiveSuperAdmin(excludeId: string) {
    const remainingActiveSuperAdmins = await this.prisma.user.count({
      where: { role: Role.super_admin, isActive: true, id: { not: excludeId } },
    });

    if (remainingActiveSuperAdmins === 0) {
      throw new AppException(
        'LAST_SUPER_ADMIN',
        'Impossible : il doit rester au moins un compte Super Admin actif',
        409,
      );
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