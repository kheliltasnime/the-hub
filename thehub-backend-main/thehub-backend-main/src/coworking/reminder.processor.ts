import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../common/notifications/notification.service';
import { COWORKING_REMINDERS_QUEUE, ReminderType } from './reminder-queue.constants';

type ReminderJobData = {
  reservationId: string;
  userId: string;
  type: ReminderType;
};

@Processor(COWORKING_REMINDERS_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { reservationId, type } = job.data;

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { space: true, user: true },
    });

    // La réservation a pu être annulée ou reprogrammée entre-temps (le job aurait
    // dû être retiré via cancelReminders/rescheduleReminders, mais on double-check
    // ici par sécurité — ex: job déjà en cours d'exécution au moment de l'annulation).
    if (!reservation || reservation.status !== ReservationStatus.confirmed) {
      this.logger.debug(`Rappel ${type} ignoré : réservation ${reservationId} non confirmée ou introuvable`);
      return;
    }

    const label = type === ReminderType.J1 ? 'demain' : 'dans 2h';

    // NOTE : le CDC (§8.3 admin) demande un rappel "push OU email". Le NotificationService
    // actuel ne gère que le push FCM (sendPush) — il n'y a pas d'envoi d'email pour l'instant.
    // Si un module mail existe ailleurs (ou à créer), branche-le ici en plus de sendPush.
    await this.notificationService.sendPush(
      reservation.userId,
      'Rappel réservation The Hub',
      `Votre réservation "${reservation.space.name}" commence ${label} à ${reservation.startTime}.`,
      { reservationId: reservation.id, type },
    );
  }
}