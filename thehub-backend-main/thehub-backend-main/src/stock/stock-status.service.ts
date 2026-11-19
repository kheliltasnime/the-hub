import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeStockStatus,
  computeGlobalStockStatus,
  resolveThresholds,
  StockStatus,
  StockThresholds,
} from './stock-status.util';

type StockItemWithRelations = {
  id: string;
  menuItemId: string;
  currentStock: number;
  targetStock: number;
  greenThresholdPct: number | null;
  orangeThresholdPct: number | null;
  menuItem: { categorie: { greenThresholdPct: number | null; orangeThresholdPct: number | null } };
};

const SEVERITY: Record<StockStatus, number> = {
  [StockStatus.VERT]: 0,
  [StockStatus.ORANGE]: 1,
  [StockStatus.ROUGE]: 2,
  [StockStatus.NON_CONFIGURE]: -1,
};

@Injectable()
export class StockStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getThresholdsFor(item: StockItemWithRelations): StockThresholds {
    return resolveThresholds(
      item.greenThresholdPct,
      item.orangeThresholdPct,
      item.menuItem.categorie.greenThresholdPct,
      item.menuItem.categorie.orangeThresholdPct,
    );
  }

  computeStatusFor(item: StockItemWithRelations) {
    return computeStockStatus(item.currentStock, item.targetStock, this.getThresholdsFor(item));
  }

  /**
   * À appeler après TOUTE opération pouvant faire changer le statut d'un article
   * (mouvement de stock, changement de stock cible, changement de seuils) — Étape 3, points 1-2.
   */
  async handleStatusChange(
    before: ReturnType<typeof computeStockStatus>,
    item: StockItemWithRelations,
  ) {
    const after = this.computeStatusFor(item);
    if (after.status === before.status) return; // rien à notifier

    // N'alerte que sur une DÉGRADATION (vert→orange, orange→rouge, vert→rouge) —
    // §7.4 CDC technique : "Passage sous un seuil configuré".
    if (SEVERITY[after.status] > SEVERITY[before.status]) {
      const thresholds = this.getThresholdsFor(item);
      this.eventEmitter.emit('stock.alert', {
        itemId: item.id,
        menuItemId: item.menuItemId,
        level: after.status,
        threshold:
          after.status === StockStatus.ROUGE ? thresholds.orangeThresholdPct : thresholds.greenThresholdPct,
        currentStock: item.currentStock,
        targetStock: item.targetStock,
        percentage: after.percentage,
      });
    }

    await this.emitGlobalStatusChanged();
  }

  // Bloc 1 page d'accueil (§5.1) — recalculé à chaque changement de statut d'article
  async emitGlobalStatusChanged() {
    const items = await this.prisma.stockItem.findMany({
      include: { menuItem: { include: { categorie: true } } },
    });
    const statuses = items.map((item) => this.computeStatusFor(item).status);
    const global = computeGlobalStockStatus(statuses);

    this.eventEmitter.emit('stock.global_status_changed', {
      status: global,
      criticalCount: statuses.filter((s) => s === StockStatus.ROUGE).length,
      warningCount: statuses.filter((s) => s === StockStatus.ORANGE).length,
    });
  }
}