import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { Prisma, Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SuspendMemberDto } from './dto/suspend-member.dto';
import { ActivateMemberDto } from './dto/activate-member.dto';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { AddLoyaltyPointsDto } from './dto/add-loyalty-points.dto';
import { GetMembersDto } from './dto/get-members.dto';
import { GetMemberHistoryDto } from './dto/get-member-history.dto';
import { AppException } from '../common/app.exception';

// On exclut systématiquement passwordHash/pinHash des réponses admin
const MEMBER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  profileType: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletGateway: WalletGatewayService,
  ) {}

  // ============================================================
  // Annuaire — §7.1
  // ============================================================

  async listMembers(filters: GetMembersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = this.buildMembersWhere(filters);

    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: MEMBER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      members,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Export CSV de l'annuaire filtré (mêmes filtres que listMembers, sans pagination) — §7.1
  async exportMembersCsv(filters: GetMembersDto): Promise<string> {
    const where = this.buildMembersWhere(filters);

    const members = await this.prisma.user.findMany({
      where,
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    const header = ['ID', 'Email', 'Nom complet', 'Profil', 'Statut', 'Email vérifié', "Date d'inscription"];
    const rows = members.map((m) => [
      m.id,
      m.email,
      m.fullName,
      m.profileType,
      m.isActive ? 'Actif' : 'Suspendu',
      m.emailVerified ? 'Oui' : 'Non',
      m.createdAt.toISOString(),
    ]);

    return [header, ...rows].map((row) => row.map((v) => this.csvEscape(v)).join(',')).join('\n');
  }

  private csvEscape(value: unknown): string {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  private buildMembersWhere(filters: GetMembersDto): Prisma.UserWhereInput {
    return {
      // Forcé côté service, jamais exposé en filtre : ce module ne liste QUE
      // les membres app. Les comptes staff relèvent d'AdminModule.
      role: Role.user,
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.profileType && { profileType: filters.profileType }),
      ...((filters.registeredFrom || filters.registeredTo) && {
        createdAt: {
          ...(filters.registeredFrom && { gte: new Date(filters.registeredFrom) }),
          ...(filters.registeredTo && { lte: new Date(filters.registeredTo) }),
        },
      }),
      ...(filters.search && {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  // ============================================================
  // Fiche membre — §7.2
  // ============================================================

  async getMemberById(id: string) {
    const member = await this.prisma.user.findUnique({ where: { id }, select: MEMBER_SELECT });
    if (!member || member.role !== Role.user) {
      throw new AppException('MEMBER_NOT_FOUND', 'Membre introuvable', 404);
    }
    return member;
  }

  // Version interne complète (avec walletReferenceId) — jamais renvoyée telle quelle à l'API,
  // utilisée uniquement pour les opérations wallet.
  private async getMemberEntityOrThrow(id: string) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || member.role !== Role.user) {
      throw new AppException('MEMBER_NOT_FOUND', 'Membre introuvable', 404);
    }
    return member;
  }

  async createMember(dto: CreateMemberDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new AppException('EMAIL_ALREADY_EXISTS', 'Un compte existe déjà avec cet email', 409);
    }

    const generatedPassword = dto.password ?? randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const member = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        profileType: dto.profileType,
        role: Role.user, // Toujours 'user' — voir CreateMemberDto
        passwordHash,
        // Créé directement par un admin → pas besoin de vérifier l'email,
        // même logique que AdminAccountsService.createAccount.
        emailVerified: true,
      },
      select: MEMBER_SELECT,
    });

    if (!dto.password) {
      // TODO: brancher le NotificationModule pour l'envoi réel de ce mot de passe temporaire
      console.log(`[DEV] Mot de passe temporaire pour ${dto.email} : ${generatedPassword}`);
    }

    return member;
  }

  async updateMember(id: string, dto: UpdateMemberDto) {
    await this.getMemberById(id); // 404 si inexistant

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.profileType && { profileType: dto.profileType }),
      },
      select: MEMBER_SELECT,
    });
  }

  // ============================================================
  // Suspension / réactivation — §7.3 ("avec motif")
  // "Suspension" = désactivation logique, pas un vrai DELETE SQL (FK sur
  // commandes/réservations/events sans onDelete: Cascade).
  // ============================================================

  async suspendMember(actorId: string, id: string, dto: SuspendMemberDto) {
    const member = await this.getMemberById(id);
    if (!member.isActive) {
      throw new AppException('MEMBER_ALREADY_SUSPENDED', 'Ce membre est déjà suspendu', 409);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: MEMBER_SELECT,
    });

    await this.writeAuditLog(actorId, 'MEMBER_SUSPENDED', id, dto.reason);
    return updated;
  }

  async activateMember(actorId: string, id: string, dto: ActivateMemberDto) {
    const member = await this.getMemberById(id);
    if (member.isActive) {
      throw new AppException('MEMBER_ALREADY_ACTIVE', 'Ce membre est déjà actif', 409);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: MEMBER_SELECT,
    });

    await this.writeAuditLog(actorId, 'MEMBER_REACTIVATED', id, dto.reason);
    return updated;
  }

  // ============================================================
  // Wallet — §7.2 (solde + historique) / §7.3 (crédit-débit manuel)
  // Branché sur le vrai WalletGatewayService — plus de mock.
  // ============================================================

  async getMemberWallet(actorId: string, id: string) {
    const member = await this.getMemberEntityOrThrow(id);

    if (!member.walletReferenceId) {
      return { balance: 0, transactions: [] as unknown[] };
    }

    const [balance, transactions] = await Promise.all([
      this.walletGateway.getBalance(member.walletReferenceId, actorId),
      this.walletGateway.getTransactions(member.walletReferenceId, actorId),
    ]);

    return { balance, transactions };
  }

  async creditWallet(actorId: string, id: string, dto: CreditWalletDto) {
    const member = await this.getMemberEntityOrThrow(id);
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(member.id);

    const { transactionId, newBalance } = await this.walletGateway.topup(walletReferenceId, dto.amount, actorId);

    await this.writeAuditLog(actorId, 'WALLET_CREDITED', id, dto.reason, {
      amount: dto.amount,
      transactionId,
    });

    return { message: `Wallet crédité de ${dto.amount} DT`, amount: dto.amount, newBalance, reason: dto.reason };
  }

  async debitWallet(actorId: string, id: string, dto: DebitWalletDto) {
    const member = await this.getMemberEntityOrThrow(id);
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(member.id);

    // Clé d'idempotence propre à cette action manuelle (évite tout double débit en cas de retry).
    const idempotencyKey = `admin-debit-${id}-${randomUUID()}`;
    const { transactionId } = await this.walletGateway.debit(walletReferenceId, dto.amount, idempotencyKey, actorId);

    await this.writeAuditLog(actorId, 'WALLET_DEBITED', id, dto.reason, {
      amount: dto.amount,
      transactionId,
    });

    return { message: `Wallet débité de ${dto.amount} DT`, amount: dto.amount, reason: dto.reason };
  }

  // ============================================================
  // Fidélité — toujours mockée : LoyaltyModule n'existe pas encore.
  // L'audit log, lui, est réel dès maintenant.
  // ============================================================

  async addLoyaltyPoints(actorId: string, id: string, dto: AddLoyaltyPointsDto) {
    await this.getMemberById(id);

    // TODO: appel réel au LoyaltyModule une fois ce module créé
    await this.writeAuditLog(actorId, 'LOYALTY_POINTS_ADDED', id, dto.reason, { points: dto.points });

    return { message: `${dto.points} points ajoutés`, points: dto.points, reason: dto.reason };
  }

  // ============================================================
  // Historique commandes F&B — §7.2
  // ============================================================

  async getMemberOrders(id: string, filters: GetMemberHistoryDto) {
    await this.getMemberById(id);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.OrderWhereInput = { userId: id };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { menuItem: true } }, enseigne: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        enseigne: o.enseigne.nom,
        statut: o.statut,
        channel: o.channel,
        modePaiement: o.modePaiement,
        total: Number(o.totalPrix),
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          nom: i.menuItem.nom,
          quantite: i.quantite,
          prixUnitaire: Number(i.prixUnitaire),
        })),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================================
  // Historique réservations coworking — §7.2
  // ============================================================

  async getMemberReservations(id: string, filters: GetMemberHistoryDto) {
    await this.getMemberById(id);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.ReservationWhereInput = { userId: id };

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: { space: true },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations: reservations.map((r) => ({
        id: r.id,
        espace: r.space.name,
        startDate: r.startDate,
        endDate: r.endDate,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        amountPaid: r.amountPaid ? Number(r.amountPaid) : null,
        refundAmount: r.refundAmount ? Number(r.refundAmount) : null,
        cancellationReason: r.cancellationReason,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================================
  // Export PDF fiche membre — §7.3
  // ============================================================

  async generateMemberPdf(actorId: string, id: string): Promise<Buffer> {
    const member = await this.getMemberById(id);
    const wallet = await this.getMemberWallet(actorId, id).catch(() => ({ balance: 0, transactions: [] as unknown[] }));
    const { orders } = await this.getMemberOrders(id, { page: 1, limit: 10 });
    const { reservations } = await this.getMemberReservations(id, { page: 1, limit: 10 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('The Hub Ghazela — Fiche membre', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Nom : ${member.fullName}`);
      doc.text(`Email : ${member.email}`);
      doc.text(`Profil : ${member.profileType}`);
      doc.text(`Statut : ${member.isActive ? 'Actif' : 'Suspendu'}`);
      doc.text(`Inscrit le : ${member.createdAt.toLocaleDateString('fr-FR')}`);
      doc.moveDown();

      doc.fontSize(14).text('Wallet');
      doc.fontSize(12).text(`Solde actuel : ${wallet.balance} DT`);
      doc.moveDown();

      doc.fontSize(14).text('Commandes F&B récentes');
      if (orders.length === 0) {
        doc.fontSize(12).text('Aucune commande.');
      } else {
        orders.forEach((o) => {
          doc.fontSize(11).text(
            `${new Date(o.createdAt).toLocaleDateString('fr-FR')} — ${o.enseigne} — ${o.statut} — ${o.total} DT`,
          );
        });
      }
      doc.moveDown();

      doc.fontSize(14).text('Réservations récentes');
      if (reservations.length === 0) {
        doc.fontSize(12).text('Aucune réservation.');
      } else {
        reservations.forEach((r) => {
          doc.fontSize(11).text(
            `${new Date(r.startDate).toLocaleDateString('fr-FR')} — ${r.espace} — ${r.startTime}-${r.endTime} — ${r.status}`,
          );
        });
      }

      doc.end();
    });
  }

  // ============================================================
  // Audit log — persisté en base (admin_audit_log). Qui / quoi / quand / motif.
  // ============================================================

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