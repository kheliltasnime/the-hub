import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StockItemsService } from './stock-items.service';

@Injectable()
export class MenuItemCreatedListener {
  private readonly logger = new Logger(MenuItemCreatedListener.name);

  constructor(private readonly stockItemsService: StockItemsService) {}

  // §5.2 point 2 : une fiche de stock (vide, stock cible 0) est créée automatiquement
  // pour tout nouvel article — le Manager F&B n'a plus qu'à saisir le stock cible.
  @OnEvent('menu.item_created')
  async handleMenuItemCreated(payload: { menuItemId: string }) {
    try {
      await this.stockItemsService.ensureStockItemExists(payload.menuItemId);
    } catch (err) {
      this.logger.error(`Echec auto-création StockItem pour l'article ${payload.menuItemId}`, err as Error);
    }
  }
}