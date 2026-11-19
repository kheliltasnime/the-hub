import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { StockStatusService } from './stock-status.service';
import { CreateStockMovementDto, MANUAL_MOVEMENT_TYPES } from './dto/create-stock-movement.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';

const STOCK_ITEM_INCLUDE = {
  menuItem: { include: { categorie: true } },
} satisfies Prisma.StockItemInclude;

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockStatus: StockStatusService,
  ) {}

  private async getStockItemOrThrow(id: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id }, include: STOCK_ITEM_INCLUDE });
    if (!item) throw new AppException('STOCK_ITEM_NOT_FOUND', 'Fiche de stock introuvable', 404);
    return item;
  }

  // §5.2 point 3 : entrées fournisseurs et ajustements manuels
  async createManualMovement(actorId: string, stockItemId: string, dto: CreateStockMovementDto) {
    const stockItem = await this.getStockItemOrThrow(stockItemId);

    if (!MANUAL_MOVEMENT_TYPES.includes(dto.type)) {
      throw new AppException(
        'INVALID_MOVEMENT_TYPE',
        'Seuls ENTREE_FOURNISSEUR et AJUSTEMENT_MANUEL peuvent être créés manuellement',
        400,
      );
    }
    if (dto.type === StockMovementType.ENTREE_FOURNISSEUR && dto.quantite <= 0) {
      throw new AppException('INVALID_QUANTITY', 'La quantité doit être positive pour une entrée fournisseur', 400);
    }
    if (dto.type === StockMovementType.AJUSTEMENT_MANUEL && dto.quantite === 0) {
      throw new AppException('INVALID_QUANTITY', 'La quantité ne peut pas être nulle pour un ajustement', 400);
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new AppException('SUPPLIER_NOT_FOUND', 'Fournisseur introuvable', 404);
    }

    const delta = dto.type === StockMovementType.ENTREE_FOURNISSEUR ? Math.abs(dto.quantite) : dto.quantite;

    if (stockItem.currentStock + delta < 0) {
      throw new AppException('NEGATIVE_STOCK', 'Cet ajustement ferait passer le stock en négatif', 400);
    }

    const beforeStatus = this.stockStatus.computeStatusFor(stockItem);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          stockItemId,
          type: dto.type,
          quantite: delta,
          supplierId: dto.supplierId,
          reason: dto.reason,
          createdById: actorId,
        },
      });
      return tx.stockItem.update({
        where: { id: stockItemId },
        data: { currentStock: { increment: delta } }, // opération atomique, pas de race condition
        include: STOCK_ITEM_INCLUDE,
      });
    });

    await this.stockStatus.handleStatusChange(beforeStatus, updated);
    return updated;
  }

  // §5.2 point 3 (sortie automatique) — appelé par StockOrderConsumptionListener.
  // Idempotent : si un mouvement existe déjà pour (stockItemId, orderId), on ignore
  // (protège contre un rejeu de l'événement order.placed).
  async registerConsumption(stockItemId: string, quantite: number, orderId: string) {
    const existing = await this.prisma.stockMovement.findFirst({
      where: { stockItemId, orderId, type: StockMovementType.SORTIE_CONSOMMATION },
    });
    if (existing) return;

    const stockItem = await this.prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: STOCK_ITEM_INCLUDE,
    });
    if (!stockItem) return;

    const beforeStatus = this.stockStatus.computeStatusFor(stockItem);
    const delta = -Math.abs(quantite);

    // Jamais bloquant : la commande est déjà validée/payée. Le stock peut passer en
    // négatif (rupture non anticipée) — c'est justement ce que l'alerte doit signaler.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: { stockItemId, type: StockMovementType.SORTIE_CONSOMMATION, quantite: delta, orderId },
      });
      return tx.stockItem.update({
        where: { id: stockItemId },
        data: { currentStock: { increment: delta } },
        include: STOCK_ITEM_INCLUDE,
      });
    });

    await this.stockStatus.handleStatusChange(beforeStatus, updated);
  }

  // §5.2 point 7 — GET /admin/stock/:itemId/movements
  async listMovements(stockItemId: string, filters: GetStockMovementsDto) {
    await this.getStockItemOrThrow(stockItemId);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.StockMovementWhereInput = {
      stockItemId,
      ...(filters.type && { type: filters.type }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      }),
    };

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { movements, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}