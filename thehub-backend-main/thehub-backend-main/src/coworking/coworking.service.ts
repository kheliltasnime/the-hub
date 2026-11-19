import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  Prisma,
  PaymentMode,
  ReservationStatus,
  PricingUnit,
  DurationType,
  HalfDayPeriod,
  SpaceBlockReason,
  SpaceType,
  CoworkingSpace,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetSpacesDto } from './dto/get-spaces.dto';
import { GetEnseignesDto } from './dto/get-enseignes.dto';
import { CreateSpaceBlockDto } from './dto/create-space-block.dto';
import { AppException } from '../common/app.exception';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';

export enum SpaceStatus {
  disponible = 'disponible',
  presque_plein = 'presque_plein',
  complet = 'complet',
  ferme = 'ferme',
}

type DaySlot = { start: string; end: string };

type ResolvedSlot = {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  amount: number;
  durationType: DurationType | null;
  halfDayPeriod: HalfDayPeriod | null;
  numberOfDays: number | null;
  activityId: string | null;
};

// Types d'espaces gérés comme un "pool" (plusieurs unités interchangeables) :
// le statut dépend du taux d'occupation du pool, pas d'une réservation unique.
const POOL_SPACE_TYPES: SpaceType[] = [SpaceType.hot_desk, SpaceType.bureau_prive, SpaceType.game_zone];

// Seuils d'occupation pour le statut "presque plein" / "complet" des espaces poolés.
const NEARLY_FULL_RATIO = 0.8;

@Injectable()
export class CoworkingService {
  // Horaires par défaut si l'espace n'a pas de plage définie en base.
  private readonly DEFAULT_OPENING_HOUR = '08:00';
  private readonly DEFAULT_CLOSING_HOUR = '22:00';
  private readonly HALF_DAY_SPLIT = '15:00'; // découpe matin/après-midi pour les espaces facturés à la journée
  private readonly HOURLY_SLOT_DURATION_MINUTES = 30;
  private readonly FULL_REFUND_HOURS = 48;
  private readonly REFUND_PERCENT_FULL = 100;
  private readonly REFUND_PERCENT_PARTIAL = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly reminderScheduler: ReminderSchedulerService,
    private readonly walletGateway: WalletGatewayService,
  ) {}

  // ============================================================
  // Enseignes
  // ============================================================

  async listEnseignes(filters: GetEnseignesDto) {
    return this.prisma.enseigne.findMany({
      where: {
        actif: true,
        coworkingSpaces: { some: {} },
        ...(filters.search && {
          nom: { contains: filters.search, mode: 'insensitive' },
        }),
      },
      orderBy: { nom: 'asc' },
    });
  }

  // ============================================================
  // Consultation des espaces
  // ============================================================

  async listSpaces(filters: GetSpacesDto) {
    const spaces = await this.prisma.coworkingSpace.findMany({
      where: {
        isActive: true,
        ...(filters.type && { type: filters.type }),
        ...(filters.minCapacity && { capacityMax: { gte: filters.minCapacity } }),
        ...(filters.enseigneId && { enseigneId: filters.enseigneId }),
        ...(filters.search && {
          name: { contains: filters.search, mode: 'insensitive' },
        }),
      },
      include: { enseigne: true },
      orderBy: { name: 'asc' },
    });

    if (spaces.length === 0) return [];

    const statuses = await this.computeStatusesForSpaces(spaces, new Date());

    return spaces.map((space) => ({
      ...space,
      status: statuses.get(space.id)!.status,
      blockReason: statuses.get(space.id)!.blockReason ?? null,
    }));
  }

  async getSpace(spaceId: string) {
    const space = await this.prisma.coworkingSpace.findUnique({
      where: { id: spaceId },
      include: { enseigne: true },
    });
    if (!space || !space.isActive) {
      throw new AppException('SPACE_NOT_FOUND', 'Espace introuvable ou indisponible', 404);
    }
    const statuses = await this.computeStatusesForSpaces([space], new Date());
    const computed = statuses.get(space.id)!;
    return { ...space, status: computed.status, blockReason: computed.blockReason ?? null };
  }

  // ---------- Statut calculé (dispo / presque_plein / complet / ferme) ----------

  private async computeStatusesForSpaces(
    spaces: CoworkingSpace[],
    now: Date,
  ): Promise<Map<string, { status: SpaceStatus; blockReason?: SpaceBlockReason }>> {
    const spaceIds = spaces.map((s) => s.id);
    const today = this.dateOnly(now);
    const nowTime = this.timeOnly(now);

    const [activeBlocks, activeReservations] = await Promise.all([
      this.prisma.spaceBlock.findMany({
        where: {
          spaceId: { in: spaceIds },
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          spaceId: { in: spaceIds },
          status: ReservationStatus.confirmed,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { spaceId: true, startTime: true, endTime: true },
      }),
    ]);

    const result = new Map<string, { status: SpaceStatus; blockReason?: SpaceBlockReason }>();

    for (const space of spaces) {
      // 1. Un blocage actif "maintenant" prime sur tout le reste.
      const block = activeBlocks.find(
        (b) => b.spaceId === space.id && this.timeRangesOverlap(nowTime, nowTime, b.startTime, b.endTime),
      );
      if (block) {
        result.set(space.id, { status: SpaceStatus.ferme, blockReason: block.reasonType });
        continue;
      }

      const reservationsNow = activeReservations.filter(
        (r) => r.spaceId === space.id && this.timeRangesOverlap(nowTime, nowTime, r.startTime, r.endTime),
      );

      if (POOL_SPACE_TYPES.includes(space.type)) {
        // Espace "pool" : statut basé sur le taux d'occupation vs capacityMax (nombre d'unités du pool).
        const ratio = space.capacityMax > 0 ? reservationsNow.length / space.capacityMax : 0;
        if (ratio >= 1) result.set(space.id, { status: SpaceStatus.complet });
        else if (ratio >= NEARLY_FULL_RATIO) result.set(space.id, { status: SpaceStatus.presque_plein });
        else result.set(space.id, { status: SpaceStatus.disponible });
      } else {
        // Espace unitaire (salle de réunion, studio...) : occupé ou non, binaire.
        result.set(space.id, {
          status: reservationsNow.length > 0 ? SpaceStatus.complet : SpaceStatus.disponible,
        });
      }
    }

    return result;
  }

  // ---------- Tarification à l'activité ----------

  async listActivities(spaceId: string) {
    const space = await this.prisma.coworkingSpace.findUnique({ where: { id: spaceId } });
    if (!space) {
      throw new AppException('SPACE_NOT_FOUND', 'Espace introuvable', 404);
    }
    if (space.pricingUnit !== PricingUnit.activity) {
      throw new AppException(
        'NOT_ACTIVITY_PRICED',
        "Cet espace n'est pas facturé à l'activité",
        400,
      );
    }
    return this.prisma.spaceActivityPricing.findMany({
      where: { spaceId, isActive: true },
      orderBy: { activity: 'asc' },
    });
  }

  // ============================================================
  // Blocages d'espace (maintenance, travaux, réparation, événement interne, fermeture externe)
  // ============================================================

  async createBlock(actorId: string, spaceId: string, dto: CreateSpaceBlockDto) {
    const space = await this.prisma.coworkingSpace.findUnique({ where: { id: spaceId } });
    if (!space) {
      throw new AppException('SPACE_NOT_FOUND', 'Espace introuvable', 404);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new AppException('INVALID_RANGE', 'endDate doit être postérieure ou égale à startDate', 400);
    }

    const created = await this.prisma.spaceBlock.create({
      data: {
        spaceId,
        reasonType: dto.reasonType,
        reasonNote: dto.reasonNote,
        startDate,
        endDate,
        startTime: dto.startTime ?? '00:00',
        endTime: dto.endTime ?? '23:59',
        createdById: actorId,
      },
    });

    await this.emitSpaceUpdated(spaceId);
    return created;
  }

  async listBlocks(spaceId: string) {
    return this.prisma.spaceBlock.findMany({
      where: { spaceId },
      orderBy: { startDate: 'desc' },
    });
  }

  async deleteBlock(blockId: string) {
    const block = await this.prisma.spaceBlock.findUnique({ where: { id: blockId } });
    if (!block) {
      throw new AppException('BLOCK_NOT_FOUND', 'Blocage introuvable', 404);
    }
    await this.prisma.spaceBlock.delete({ where: { id: blockId } });
    await this.emitSpaceUpdated(block.spaceId);
    return { id: blockId, deleted: true };
  }

  // ============================================================
  // Disponibilité
  // ============================================================

  async getAvailability(spaceId: string, dto: GetAvailabilityDto) {
    const space = await this.prisma.coworkingSpace.findUnique({ where: { id: spaceId } });
    if (!space || !space.isActive) {
      throw new AppException('SPACE_NOT_FOUND', 'Espace introuvable ou indisponible', 404);
    }

    const targetDate = new Date(dto.date);
    const block = await this.findBlockCoveringDate(spaceId, targetDate);

    // Espaces facturés à la journée
    if (space.pricingUnit === PricingUnit.day) {
      const dayReservations = await this.prisma.reservation.findMany({
        where: {
          spaceId,
          status: { in: [ReservationStatus.confirmed] },
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
        select: { startTime: true, endTime: true },
      });

      const opening = space.openingHour;
      const closing = space.closingHour;

      const morningTaken =
        !!block && this.timeRangesOverlap(opening, this.HALF_DAY_SPLIT, block.startTime, block.endTime);
      const afternoonTaken =
        !!block && this.timeRangesOverlap(this.HALF_DAY_SPLIT, closing, block.startTime, block.endTime);

      const morningBooked = dayReservations.some((r) =>
        this.timeRangesOverlap(r.startTime, r.endTime, opening, this.HALF_DAY_SPLIT),
      );
      const afternoonBooked = dayReservations.some((r) =>
        this.timeRangesOverlap(r.startTime, r.endTime, this.HALF_DAY_SPLIT, closing),
      );

      return {
        spaceId,
        date: dto.date,
        blocked: !!block,
        blockReason: block?.reasonType ?? null,
        // Bornes horaires exploitables par le front pour laisser l'utilisateur choisir
        // une plage précise à l'intérieur de la demi-journée / journée qu'il sélectionne.
        openingHour: opening,
        closingHour: closing,
        halfDaySplit: this.HALF_DAY_SPLIT,
        durationOptions: [
          {
            durationType: 'half_day',
            halfDayPeriod: 'morning',
            available: !morningBooked && !morningTaken,
            boundStart: opening,
            boundEnd: this.HALF_DAY_SPLIT,
          },
          {
            durationType: 'half_day',
            halfDayPeriod: 'afternoon',
            available: !afternoonBooked && !afternoonTaken,
            boundStart: this.HALF_DAY_SPLIT,
            boundEnd: closing,
          },
          {
            durationType: 'full_day',
            available: !morningBooked && !afternoonBooked && !block,
            boundStart: opening,
            boundEnd: closing,
          },
        ],
      };
    }

    // Espaces facturés à l'heure ou à l'activité : grille de créneaux
    const existingReservations = await this.prisma.reservation.findMany({
      where: {
        spaceId,
        status: ReservationStatus.confirmed,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
      select: { startTime: true, endTime: true },
    });

    const grid = this.buildHourlyGrid(space);

    const slots = grid.map((slot) => {
      const bookedHere = existingReservations.some((r) =>
        this.timeRangesOverlap(r.startTime, r.endTime, slot.start, slot.end),
      );
      const blockedHere = !!block && this.timeRangesOverlap(slot.start, slot.end, block.startTime, block.endTime);
      return {
        startTime: slot.start,
        endTime: slot.end,
        available: !bookedHere && !blockedHere,
        blocked: blockedHere,
      };
    });

    return { spaceId, date: dto.date, slots };
  }

  // ============================================================
  // Réservation
  // ============================================================

  async createReservation(userId: string, dto: CreateReservationDto) {
    console.log('[RooftopDebug] createReservation START', {
      userId,
      spaceId: dto.spaceId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      activityId: dto.activityId,
      guestCount: dto.guestCount,
      paymentMode: dto.paymentMode,
    });

    const space = await this.prisma.coworkingSpace.findUnique({ where: { id: dto.spaceId } });
    console.log('[RooftopDebug] space lookup', { spaceId: dto.spaceId, spaceFound: !!space, space: space ? { id: space.id, name: space.name, type: space.type, pricingUnit: space.pricingUnit, isActive: space.isActive } : null });
    if (!space || !space.isActive) {
      throw new AppException('SPACE_NOT_FOUND', 'Espace introuvable ou indisponible', 404);
    }

    if (dto.paymentMode === PaymentMode.subscription && !dto.subscriptionId) {
      throw new AppException(
        'SUBSCRIPTION_REQUIRED',
        'subscriptionId est requis lorsque paymentMode = subscription',
        400,
      );
    }

    const slot = await this.resolveSlot(space, dto);
    console.log('[RooftopDebug] resolved slot', slot);
    this.assertSlotNotInPast(slot);

    const blockedNow = await this.findBlockCoveringSlot(space.id, slot);
    console.log('[RooftopDebug] blockedNow', blockedNow);
    if (blockedNow) {
      throw new AppException(
        'SPACE_BLOCKED',
        `Cet espace est indisponible (${blockedNow.reasonType}) sur ce créneau`,
        409,
      );
    }

    if (dto.paymentMode === PaymentMode.wallet) {
      console.log('[RooftopDebug] before wallet debit', { userId, amount: slot.amount });
      await this.mockWalletDebit(userId, slot.amount);
      console.log('[RooftopDebug] after wallet debit');
    } else {
      console.log('[RooftopDebug] subscription path');
      await this.mockSubscriptionQuotaCheck(dto.subscriptionId!);
    }

    try {
      console.log('[RooftopDebug] before transaction');
      const reservation = await this.prisma.$transaction(
        async (tx) => {
          const overlap = await tx.reservation.findFirst({
            where: {
              spaceId: dto.spaceId,
              status: ReservationStatus.confirmed,
              startDate: { lte: slot.endDate },
              endDate: { gte: slot.startDate },
              startTime: { lt: slot.endTime },
              endTime: { gt: slot.startTime },
            },
          });

          if (overlap) {
            throw new AppException('SLOT_ALREADY_BOOKED', 'Ce créneau chevauche une réservation existante', 409);
          }

          const overlapBlock = await tx.spaceBlock.findFirst({
            where: {
              spaceId: dto.spaceId,
              startDate: { lte: slot.endDate },
              endDate: { gte: slot.startDate },
              startTime: { lt: slot.endTime },
              endTime: { gt: slot.startTime },
            },
          });

          if (overlapBlock) {
            throw new AppException(
              'SPACE_BLOCKED',
              `Cet espace vient d'être bloqué (${overlapBlock.reasonType})`,
              409,
            );
          }

          console.log('[RooftopDebug] before reservation.create', {
            userId,
            spaceId: dto.spaceId,
            startDate: slot.startDate,
            endDate: slot.endDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            guestCount: dto.guestCount ?? 2,
            paymentMode: dto.paymentMode,
            amount: slot.amount,
          });

          const created = await tx.reservation.create({
            data: {
              userId,
              spaceId: dto.spaceId,
              startDate: slot.startDate,
              endDate: slot.endDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              durationType: slot.durationType ?? undefined,
              halfDayPeriod: slot.halfDayPeriod ?? undefined,
              numberOfDays: slot.numberOfDays ?? undefined,
              guestCount: dto.guestCount ?? 2,
              status: ReservationStatus.confirmed,
              paymentMode: dto.paymentMode,
              amountPaid: slot.amount,
            },
          });

          console.log('[RooftopDebug] reservation created', { reservationId: created.id, guestCount: created.guestCount, status: created.status });
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // Succès : on planifie les rappels J-1/H-2 et on notifie les clients connectés
      // que la disponibilité de cet espace vient de changer.
      await this.reminderScheduler.scheduleReminders({
        id: reservation.id,
        userId: reservation.userId!,
        startDate: reservation.startDate,
        startTime: reservation.startTime,
      });
      await this.emitSpaceUpdated(space.id);

      return reservation;
    } catch (error) {
      if (dto.paymentMode === PaymentMode.wallet) {
        await this.mockWalletRefund(userId, slot.amount);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.emitReservationConflict(dto.spaceId, 'SLOT_ALREADY_BOOKED');
        throw new AppException('SLOT_ALREADY_BOOKED', "Ce créneau vient d'être réservé", 409);
      }
      if (error instanceof AppException && (error.code === 'SLOT_ALREADY_BOOKED' || error.code === 'SPACE_BLOCKED')) {
        this.emitReservationConflict(dto.spaceId, error.code);
      }
      throw error;
    }
  }

  async listMyReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: { space: { include: { enseigne: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // ---------- Modification (reprogrammation) ----------

  async updateReservation(userId: string, reservationId: string, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { space: true },
    });

    if (!reservation || reservation.userId !== userId) {
      throw new AppException('RESERVATION_NOT_FOUND', 'Réservation introuvable', 404);
    }
    if (reservation.status !== ReservationStatus.confirmed) {
      throw new AppException(
        'RESERVATION_NOT_MODIFIABLE',
        'Cette réservation ne peut plus être modifiée',
        409,
      );
    }

    const wantsReschedule =
      dto.date || dto.startTime || dto.endTime || dto.durationType || dto.halfDayPeriod || dto.numberOfDays || dto.activityId;
    if (!wantsReschedule) {
      throw new AppException('NOTHING_TO_UPDATE', 'Aucune modification fournie', 400);
    }
    if (!dto.date) {
      throw new AppException('INCOMPLETE_SLOT', 'date est requise pour reprogrammer', 400);
    }

    const hoursUntilOriginal = this.hoursUntil(reservation.startDate, reservation.startTime);
    if (hoursUntilOriginal < this.FULL_REFUND_HOURS) {
      throw new AppException(
        'RESCHEDULE_WINDOW_CLOSED',
        `La reprogrammation n'est plus possible à moins de ${this.FULL_REFUND_HOURS}h du créneau initial. Passe par une annulation.`,
        409,
      );
    }

    const newSlot = await this.resolveSlot(reservation.space, dto);
    this.assertSlotNotInPast(newSlot);

    const blockedNow = await this.findBlockCoveringSlot(reservation.spaceId, newSlot);
    if (blockedNow) {
      throw new AppException(
        'SPACE_BLOCKED',
        `Cet espace est indisponible (${blockedNow.reasonType}) sur ce créneau`,
        409,
      );
    }

    const priceDifference = Math.round((newSlot.amount - Number(reservation.amountPaid)) * 100) / 100;

    if (reservation.paymentMode === PaymentMode.wallet) {
      if (priceDifference > 0) await this.mockWalletDebit(userId, priceDifference);
      else if (priceDifference < 0) await this.mockWalletRefund(userId, Math.abs(priceDifference));
    }

    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const overlap = await tx.reservation.findFirst({
            where: {
              spaceId: reservation.spaceId,
              status: ReservationStatus.confirmed,
              id: { not: reservationId },
              startDate: { lte: newSlot.endDate },
              endDate: { gte: newSlot.startDate },
              startTime: { lt: newSlot.endTime },
              endTime: { gt: newSlot.startTime },
            },
          });

          if (overlap) {
            throw new AppException('SLOT_ALREADY_BOOKED', "Ce nouveau créneau chevauche une réservation existante", 409);
          }

          const overlapBlock = await tx.spaceBlock.findFirst({
            where: {
              spaceId: reservation.spaceId,
              startDate: { lte: newSlot.endDate },
              endDate: { gte: newSlot.startDate },
              startTime: { lt: newSlot.endTime },
              endTime: { gt: newSlot.startTime },
            },
          });

          if (overlapBlock) {
            throw new AppException(
              'SPACE_BLOCKED',
              `Cet espace vient d'être bloqué (${overlapBlock.reasonType})`,
              409,
            );
          }

          return tx.reservation.update({
            where: { id: reservationId },
            data: {
              startDate: newSlot.startDate,
              endDate: newSlot.endDate,
              startTime: newSlot.startTime,
              endTime: newSlot.endTime,
              durationType: newSlot.durationType ?? undefined,
              halfDayPeriod: newSlot.halfDayPeriod ?? undefined,
              numberOfDays: newSlot.numberOfDays ?? undefined,
              amountPaid: newSlot.amount,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // Succès : on replanifie les rappels sur le nouveau créneau et on notifie
      // du changement de disponibilité (ancien créneau libéré, nouveau pris).
      await this.reminderScheduler.rescheduleReminders({
        id: updated.id,
        userId: updated.userId!,
        startDate: updated.startDate,
        startTime: updated.startTime,
      });
      await this.emitSpaceUpdated(reservation.spaceId);

      return updated;
    } catch (error) {
      if (reservation.paymentMode === PaymentMode.wallet) {
        if (priceDifference > 0) await this.mockWalletRefund(userId, priceDifference);
        else if (priceDifference < 0) await this.mockWalletDebit(userId, Math.abs(priceDifference));
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.emitReservationConflict(reservation.spaceId, 'SLOT_ALREADY_BOOKED', reservationId);
        throw new AppException('SLOT_ALREADY_BOOKED', "Ce nouveau créneau vient d'être réservé", 409);
      }
      if (error instanceof AppException && (error.code === 'SLOT_ALREADY_BOOKED' || error.code === 'SPACE_BLOCKED')) {
        this.emitReservationConflict(reservation.spaceId, error.code, reservationId);
      }
      throw error;
    }
  }

  // ---------- Annulation ----------

  async cancelReservation(userId: string, reservationId: string, dto: CancelReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });

    if (!reservation || reservation.userId !== userId) {
      throw new AppException('RESERVATION_NOT_FOUND', 'Réservation introuvable', 404);
    }
    if (reservation.status !== ReservationStatus.confirmed) {
      throw new AppException('RESERVATION_NOT_CANCELLABLE', 'Cette réservation ne peut plus être annulée', 409);
    }

    const hoursUntilStart = this.hoursUntil(reservation.startDate, reservation.startTime);
    const refundPercent =
      hoursUntilStart >= this.FULL_REFUND_HOURS ? this.REFUND_PERCENT_FULL : this.REFUND_PERCENT_PARTIAL;
    const refundAmount = Math.round(((Number(reservation.amountPaid) * refundPercent) / 100) * 100) / 100;

    if (reservation.paymentMode === PaymentMode.wallet && refundAmount > 0) {
      await this.mockWalletRefund(userId, refundAmount);
    }

    const cancelled = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.cancelled,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        refundAmount,
      },
    });

    await this.reminderScheduler.cancelReminders(reservationId);
    await this.emitSpaceUpdated(reservation.spaceId);

    return cancelled;
  }

  async checkIn(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== ReservationStatus.confirmed) {
      throw new AppException('RESERVATION_NOT_FOUND', 'Réservation introuvable ou non confirmée', 404);
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { checkedInAt: new Date() },
    });
  }

  // ============================================================
  // Résolution du créneau — cœur de la logique de durée / tarification
  // ============================================================

  private async resolveSlot(
    space: CoworkingSpace,
    dto: {
      date?: string;
      startTime?: string;
      endTime?: string;
      durationType?: DurationType;
      halfDayPeriod?: HalfDayPeriod;
      numberOfDays?: number;
      activityId?: string;
      guestCount?: number;
    },
  ): Promise<ResolvedSlot> {
    if (!dto.date) {
      throw new AppException('MISSING_DATE', 'date est requise', 400);
    }
    const baseDate = new Date(dto.date);

    // --- Validation de cohérence croisée des champs selon le pricingUnit de l'espace ---
    if (space.pricingUnit === PricingUnit.hour || space.pricingUnit === PricingUnit.activity) {
      if (dto.durationType || dto.halfDayPeriod || dto.numberOfDays) {
        throw new AppException(
          'IRRELEVANT_DURATION_TYPE',
          "durationType/halfDayPeriod/numberOfDays ne s'appliquent pas à cet espace (facturé à l'heure ou à l'activité).",
          400,
        );
      }
    }
    if (space.pricingUnit !== PricingUnit.activity && dto.activityId) {
      throw new AppException(
        'IRRELEVANT_ACTIVITY_ID',
        "activityId ne s'applique qu'aux espaces facturés à l'activité (pricingUnit = activity).",
        400,
      );
    }
    // Note : startTime/endTime restent autorisés pour TOUS les pricingUnit — y compris "day" —
    // afin de laisser l'utilisateur choisir librement son horaire à l'intérieur de la
    // demi-journée / journée sélectionnée (voir branches half_day / full_day / multi_day ci-dessous).

    // --- Espaces facturés à l'activité (ex: Game Zone, privatisation Rooftop) ---
    if (space.pricingUnit === PricingUnit.activity) {
      if (!dto.activityId) {
        throw new AppException('MISSING_ACTIVITY', 'activityId est requis pour cet espace', 400);
      }
      if (!dto.startTime || !dto.endTime) {
        throw new AppException('MISSING_TIME_SLOT', 'startTime et endTime sont requis pour cet espace', 400);
      }
      const guestCount = dto.guestCount ?? 1;
      if (guestCount < space.capacityMin || guestCount > space.capacityMax) {
        throw new AppException(
          'INVALID_GUEST_COUNT',
          `Le nombre de personnes doit être compris entre ${space.capacityMin} et ${space.capacityMax}.`,
          400,
        );
      }
      const activity = await this.prisma.spaceActivityPricing.findUnique({ where: { id: dto.activityId } });
      if (!activity || !activity.isActive || activity.spaceId !== space.id) {
        throw new AppException('ACTIVITY_NOT_FOUND', 'Activité introuvable pour cet espace', 404);
      }
      this.validateAgainstHourlyGrid(space, dto.startTime, dto.endTime);
      const durationHours = this.hoursBetween(dto.startTime, dto.endTime);
      const amount =
        activity.unit === PricingUnit.hour
          ? Math.round(Number(activity.price) * durationHours * guestCount * 100) / 100
          : Math.round(Number(activity.price) * guestCount * 100) / 100;

      return {
        startDate: baseDate,
        endDate: baseDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        amount,
        durationType: null,
        halfDayPeriod: null,
        numberOfDays: null,
        activityId: activity.id,
      };
    }

    const price = space.pricePerUnit ? Number(space.pricePerUnit) : 0;

    // --- Espaces facturés à l'heure (salle de réunion, etc.) ---
    if (space.pricingUnit === PricingUnit.hour) {
      if (!dto.startTime || !dto.endTime) {
        throw new AppException(
          'MISSING_TIME_SLOT',
          "startTime et endTime sont requis pour cet espace (facturé à l'heure)",
          400,
        );
      }
      this.validateAgainstHourlyGrid(space, dto.startTime, dto.endTime);

      const durationHours = this.hoursBetween(dto.startTime, dto.endTime);
      const amount = Math.round(price * durationHours * 100) / 100;

      return {
        startDate: baseDate,
        endDate: baseDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        amount,
        durationType: null,
        halfDayPeriod: null,
        numberOfDays: null,
        activityId: null,
      };
    }

    // --- Espaces facturés à la journée (hot desk, bureau privé) ---
    if (!dto.durationType) {
      throw new AppException(
        'MISSING_DURATION_TYPE',
        'durationType est requis pour cet espace (half_day, full_day ou multi_day)',
        400,
      );
    }

    switch (dto.durationType) {
      case DurationType.half_day: {
        if (!dto.halfDayPeriod) {
          throw new AppException(
            'MISSING_HALF_DAY_PERIOD',
            'halfDayPeriod est requis (morning ou afternoon) pour une réservation demi-journée',
            400,
          );
        }
        const isMorning = dto.halfDayPeriod === HalfDayPeriod.morning;
        const periodStart = isMorning ? space.openingHour : this.HALF_DAY_SPLIT;
        const periodEnd = isMorning ? this.HALF_DAY_SPLIT : space.closingHour;

        // L'utilisateur peut choisir un horaire précis à l'intérieur de la demi-journée.
        // À défaut, on garde la plage complète de la demi-journée (comportement par défaut).
        let startTime = periodStart;
        let endTime = periodEnd;
        if (dto.startTime && dto.endTime) {
          this.validateTimeWithinBounds(dto.startTime, dto.endTime, periodStart, periodEnd);
          startTime = dto.startTime;
          endTime = dto.endTime;
        }

        return {
          startDate: baseDate,
          endDate: baseDate,
          startTime,
          endTime,
          amount: Math.round((price / 2) * 100) / 100,
          durationType: DurationType.half_day,
          halfDayPeriod: dto.halfDayPeriod,
          numberOfDays: null,
          activityId: null,
        };
      }

      case DurationType.full_day: {
        const periodStart = space.openingHour;
        const periodEnd = space.closingHour;

        let startTime = periodStart;
        let endTime = periodEnd;
        if (dto.startTime && dto.endTime) {
          this.validateTimeWithinBounds(dto.startTime, dto.endTime, periodStart, periodEnd);
          startTime = dto.startTime;
          endTime = dto.endTime;
        }

        return {
          startDate: baseDate,
          endDate: baseDate,
          startTime,
          endTime,
          amount: price,
          durationType: DurationType.full_day,
          halfDayPeriod: null,
          numberOfDays: null,
          activityId: null,
        };
      }

      case DurationType.multi_day: {
        if (!dto.numberOfDays || dto.numberOfDays < 2) {
          throw new AppException(
            'INVALID_NUMBER_OF_DAYS',
            'numberOfDays doit être un entier ≥ 2 pour une réservation multi-jours',
            400,
          );
        }
        const endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + dto.numberOfDays - 1);

        const periodStart = space.openingHour;
        const periodEnd = space.closingHour;

        // Même logique : l'utilisateur peut préciser l'horaire journalier appliqué sur toute la période.
        let startTime = periodStart;
        let endTime = periodEnd;
        if (dto.startTime && dto.endTime) {
          this.validateTimeWithinBounds(dto.startTime, dto.endTime, periodStart, periodEnd);
          startTime = dto.startTime;
          endTime = dto.endTime;
        }

        return {
          startDate: baseDate,
          endDate,
          startTime,
          endTime,
          amount: Math.round(price * dto.numberOfDays * 100) / 100,
          durationType: DurationType.multi_day,
          halfDayPeriod: null,
          numberOfDays: dto.numberOfDays,
          activityId: null,
        };
      }
    }
  }

  // ---------- Helpers blocages ----------

  private async findBlockCoveringDate(spaceId: string, date: Date) {
    const day = this.dateOnly(date);
    return this.prisma.spaceBlock.findFirst({
      where: { spaceId, startDate: { lte: day }, endDate: { gte: day } },
    });
  }

  private async findBlockCoveringSlot(spaceId: string, slot: ResolvedSlot) {
    return this.prisma.spaceBlock.findFirst({
      where: {
        spaceId,
        startDate: { lte: slot.endDate },
        endDate: { gte: slot.startDate },
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    });
  }

  // ---------- Helpers internes ----------

  /**
   * Rejette toute réservation (création ou reprogrammation) dont le créneau
   * résolu est déjà passé par rapport à l'instant présent.
   */
  private assertSlotNotInPast(slot: ResolvedSlot) {
    const [h, m] = slot.startTime.split(':').map(Number);
    const startDateTime = new Date(slot.startDate);
    startDateTime.setHours(h, m, 0, 0);

    if (startDateTime.getTime() < Date.now()) {
      throw new AppException(
        'SLOT_IN_PAST',
        'Impossible de réserver ou reprogrammer sur un créneau déjà passé',
        400,
      );
    }
  }

  /**
   * Vérifie qu'un horaire personnalisé choisi par l'utilisateur (startTime/endTime)
   * reste cohérent (start < end) et contenu dans les bornes autorisées
   * (ex: bornes de la demi-journée, de la journée, ou horaires d'ouverture de l'espace).
   */
  private validateTimeWithinBounds(start: string, end: string, boundStart: string, boundEnd: string) {
    if (start >= end) {
      throw new AppException('INVALID_TIME_RANGE', 'startTime doit être antérieur à endTime', 400);
    }
    if (start < boundStart || end > boundEnd) {
      throw new AppException(
        'TIME_OUT_OF_BOUNDS',
        `L'horaire choisi doit être compris entre ${boundStart} et ${boundEnd}`,
        400,
      );
    }
  }

  private buildHourlyGrid(space: CoworkingSpace): DaySlot[] {
    const opening = space.openingHour ?? this.DEFAULT_OPENING_HOUR;
    const closing = space.closingHour ?? this.DEFAULT_CLOSING_HOUR;

    const slots: DaySlot[] = [];
    const [openH, openM] = opening.split(':').map(Number);
    const [closeH, closeM] = closing.split(':').map(Number);
    let cursor = openH * 60 + openM;
    const end = closeH * 60 + closeM;

    while (cursor + this.HOURLY_SLOT_DURATION_MINUTES <= end) {
      const startMinutes = cursor;
      const endMinutes = startMinutes + this.HOURLY_SLOT_DURATION_MINUTES;
      const start = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      slots.push({ start, end: endTime });
      cursor += 30;
    }

    return slots;
  }

  private validateAgainstHourlyGrid(space: CoworkingSpace, start: string, end: string) {
    const [openH, openM] = (space.openingHour ?? this.DEFAULT_OPENING_HOUR).split(':').map(Number);
    const [closeH, closeM] = (space.closingHour ?? this.DEFAULT_CLOSING_HOUR).split(':').map(Number);

    const startTotal = openH * 60 + openM;
    const endTotal = closeH * 60 + closeM;

    const toMinutes = (value: string) => {
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    if (startMinutes >= endMinutes) {
      throw new AppException('INVALID_SLOT', 'Le créneau doit commencer avant sa fin.', 400);
    }

    const isAligned = (value: number) => value % 30 === 0;
    if (!isAligned(startMinutes) || !isAligned(endMinutes)) {
      throw new AppException('INVALID_SLOT', 'Les créneaux doivent être alignés sur 30 minutes.', 400);
    }

    if (startMinutes < startTotal || endMinutes > endTotal) {
      throw new AppException('INVALID_SLOT', 'Le créneau doit rester dans les horaires d’ouverture.', 400);
    }

    const grid = this.buildHourlyGrid(space);
    const startIsAllowed = grid.some((slot) => slot.start === start);
    const endIsAllowed = grid.some((slot) => slot.end === end);
    if (!startIsAllowed || !endIsAllowed) {
      const suggestions = grid.slice(0, 12).map((s) => `${s.start}-${s.end}`).join(', ');
      throw new AppException(
        'INVALID_SLOT',
        `Créneau invalide. Créneaux disponibles : ${suggestions}`,
        400,
      );
    }
  }

  private timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && startB < endA;
  }

  private hoursBetween(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  }

  private hoursUntil(date: Date, startTime: string): number {
    const [h, m] = startTime.split(':').map(Number);
    const target = new Date(date);
    target.setHours(h, m, 0, 0);
    return (target.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  private dateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private timeOnly(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- Événements temps réel (CDC §6.4 mobile, §3.5 admin) ----------

  /**
   * Recalcule le statut "maintenant" de l'espace et émet un événement interne
   * (via EventEmitter2) que CoworkingGateway relaie aux clients WebSocket abonnés
   * sous la forme attendue par le CDC : { spaceId, available }.
   */
  private async emitSpaceUpdated(spaceId: string): Promise<void> {
    const space = await this.prisma.coworkingSpace.findUnique({ where: { id: spaceId } });
    if (!space) return;

    const statuses = await this.computeStatusesForSpaces([space], new Date());
    const computed = statuses.get(spaceId)!;
    const available = computed.status === SpaceStatus.disponible || computed.status === SpaceStatus.presque_plein;

    this.eventEmitter.emit('coworking.space_updated', { spaceId, available });
  }

  /**
   * Signale un conflit de réservation (race condition) au dashboard admin,
   * relayé par CoworkingGateway sur reservation:conflict.
   */
  private emitReservationConflict(spaceId: string, reason: string, reservationId?: string): void {
    this.eventEmitter.emit('coworking.reservation_conflict', { spaceId, reservationId, reason });
  }

  // --- Wallet Gateway Integration ---
  private async mockWalletDebit(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new AppException('INVALID_AMOUNT', 'Montant de paiement invalide', 400);
    }
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(userId);
    const idempotencyKey = crypto.randomUUID();
    await this.walletGateway.debit(walletReferenceId, amount, idempotencyKey, userId);
  }

  private async mockWalletRefund(userId: string, amount: number): Promise<void> {
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(userId);
    const orderId = crypto.randomUUID();
    await this.walletGateway.refund(walletReferenceId, amount, orderId, userId);
  }

  private async mockSubscriptionQuotaCheck(subscriptionId: string): Promise<void> {
    return;
  }
}