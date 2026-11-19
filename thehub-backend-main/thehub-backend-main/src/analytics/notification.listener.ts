import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../common/notifications/notification.service';
interface OrderStatusChangedPayload {
  userId?: string;
  orderId: string;
  statut: string;
  reason?: string;
}

@Injectable()
export class NotificationListener {
  constructor(private readonly notifications: NotificationService) {}

  @OnEvent('order.status_changed')
  async handleOrderStatusChanged(payload: OrderStatusChangedPayload) {
    if (!payload.userId) return; // commande comptoir (walk-in), pas de push possible

    const messages: Record<string, { title: string; body: string }> = {
      EN_PREPARATION: {
        title: 'Commande en préparation',
        body: 'Votre commande est en préparation !',
      },
      PRETE: {
        title: 'Commande prête',
        body: 'Votre commande est prête, présentez votre QR à la caisse.',
      },
      ANNULEE: {
        title: 'Commande annulée',
        body: payload.reason
          ? `Votre commande a été annulée : ${payload.reason}. Vous avez été remboursé.`
          : 'Votre commande a été annulée. Vous avez été remboursé.',
      },
    };

    const message = messages[payload.statut];
    if (!message) return;

    await this.notifications.sendPush(payload.userId, message.title, message.body, {
      orderId: payload.orderId,
      statut: payload.statut,
    });
  }
}