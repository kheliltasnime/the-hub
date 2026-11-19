import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

export interface UserEventPayload {
  userId?: string;   // <-- optionnel maintenant
  entityId?: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private readonly prisma: PrismaService) {}

  private async persist(eventType: string, payload: UserEventPayload) {
    try {
      await this.prisma.userEvent.create({
        data: {
          userId: payload.userId,
          eventType,
          entityId: payload.entityId,
          metadata: payload.metadata ?? {},
          context: payload.context ?? {},
        },
      });
    } catch (err) {
      this.logger.error(`Echec persistance event ${eventType}`, err as Error);
    }
  }

  @OnEvent('user.registered')
  handleUserRegistered(payload: UserEventPayload) { return this.persist('user_registered', payload); }

  @OnEvent('user.logged_in')
  handleUserLoggedIn(payload: UserEventPayload) { return this.persist('user_logged_in', payload); }

  @OnEvent('cart.item_added')
  handleCartItemAdded(payload: UserEventPayload) { return this.persist('cart_item_added', payload); }

  @OnEvent('cart.item_updated')
  handleCartItemUpdated(payload: UserEventPayload) { return this.persist('cart_item_updated', payload); }

  @OnEvent('cart.item_removed')
  handleCartItemRemoved(payload: UserEventPayload) { return this.persist('cart_item_removed', payload); }

  @OnEvent('cart.cleared')
  handleCartCleared(payload: UserEventPayload) { return this.persist('cart_cleared', payload); }

  @OnEvent('order.placed')
  handleOrderPlaced(payload: UserEventPayload) { return this.persist('order_placed', payload); }
}