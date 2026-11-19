import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from './stock-movements.service';

@Injectable()
export class StockOrderConsumptionListener {
  private readonly logger = new Logger(StockOrderConsumptionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  // Écoute le même événement 'order.placed' déjà émis par OrderService.checkout()
  // ET createWalkInOrder() — aucune modification nécessaire côté OrderModule.
  @OnEvent('order.placed')
  async handleOrderPlaced(payload: { entityId: string; metadata?: Record<string, unknown> }) {
    const orderId = payload.entityId;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        this.logger.warn(`order.placed reçu pour une commande introuvable (${orderId})`);
        return;
      }

      for (const orderItem of order.items) {
        const stockItem = await this.prisma.stockItem.findUnique({
          where: { menuItemId: orderItem.menuItemId },
        });
        // Article sans fiche de stock configurée — ignoré silencieusement, ne doit
        // jamais faire échouer une commande déjà confirmée.
        if (!stockItem) continue;

        await this.stockMovementsService.registerConsumption(stockItem.id, orderItem.quantite, orderId);
      }
    } catch (err) {
      // Ne remonte JAMAIS l'erreur : la commande est déjà validée et payée. Un souci
      // de décrément stock est loggé pour intervention manuelle, pas bloquant.
      this.logger.error(`Echec décrément stock pour la commande ${orderId}`, err as Error);
    }
  }
}