import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { COWORKING_REMINDERS_QUEUE, ReminderType } from './reminder-queue.constants';

type ReservationForReminder = {
  id: string;
  userId: string;
  startDate: Date;
  startTime: string; // format "HH:mm"
};

const J1_HOURS_BEFORE = 24;
const H2_HOURS_BEFORE = 2;

/**
 * Planifie et annule les rappels de réservation (J-1 et H-2, cf. CDC §8.3 admin :
 * "Envoyer un rappel par notification push ou email à un membre avant sa réservation").
 *
 * Chaque rappel est un job BullMQ différé (delay), avec un jobId déterministe
 * (`reminder:{reservationId}:{type}`) : ça rend l'appel idempotent — replanifier
 * remplace simplement le job existant, pas besoin de vérifier manuellement s'il
 * existe déjà avant d'ajouter.
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(@InjectQueue(COWORKING_REMINDERS_QUEUE) private readonly queue: Queue) {}

  /** Planifie les deux rappels (J-1 et H-2) d'une réservation fraîchement créée. */
  async scheduleReminders(reservation: ReservationForReminder): Promise<void> {
    const startDateTime = this.toDateTime(reservation.startDate, reservation.startTime);
    await this.scheduleOne(reservation, ReminderType.J1, startDateTime, J1_HOURS_BEFORE);
    await this.scheduleOne(reservation, ReminderType.H2, startDateTime, H2_HOURS_BEFORE);
  }

  /** Annule les rappels existants — à appeler avant annulation ou reprogrammation. */
  async cancelReminders(reservationId: string): Promise<void> {
    await this.removeIfExists(this.jobId(reservationId, ReminderType.J1));
    await this.removeIfExists(this.jobId(reservationId, ReminderType.H2));
  }

  /** Reprogrammation : annule les anciens rappels puis replanifie sur le nouveau créneau. */
  async rescheduleReminders(reservation: ReservationForReminder): Promise<void> {
    await this.cancelReminders(reservation.id);
    await this.scheduleReminders(reservation);
  }

  private async scheduleOne(
    reservation: ReservationForReminder,
    type: ReminderType,
    startDateTime: Date,
    hoursBefore: number,
  ) {
    const fireAt = new Date(startDateTime.getTime() - hoursBefore * 60 * 60 * 1000);
    const delay = fireAt.getTime() - Date.now();

    if (delay <= 0) {
      // Le créneau est trop proche (ou déjà passé) pour ce palier de rappel : on ne planifie pas.
      this.logger.debug(`Rappel ${type} ignoré pour ${reservation.id} : fenêtre déjà dépassée`);
      return;
    }

    await this.queue.add(
      'send-reminder',
      { reservationId: reservation.id, userId: reservation.userId, type },
      {
        jobId: this.jobId(reservation.id, type),
        delay,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  private async removeIfExists(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  private jobId(reservationId: string, type: ReminderType): string {
    return `reminder:${reservationId}:${type}`;
  }

  private toDateTime(date: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    return dt;
  }
}