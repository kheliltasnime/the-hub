import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { StockStatusService } from './stock-status.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { UpdateThresholdsDto } from './dto/update-thresholds.dto';
import { GetStockItemsDto } from './dto/get-stock-items.dto';

const STOCK_ITEM_INCLUDE = {
  menuItem: { include: { categorie: true, enseigne: true } },
  supplier: true,
} satisfies Prisma.StockItemInclude;

@Injectable()
export class StockItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockStatus: StockStatusService,
  ) {}

  // §5.2 point 5 — GET /admin/stock : niveaux + statut par article
  async listItems(filters: GetStockItemsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const where: Prisma.StockItemWhereInput = {
      ...(filters.enseigneId && { menuItem: { enseigneId: filters.enseigneId } }),
      ...(filters.categorieId && { menuItem: { categorieId: filters.categorieId } }),
      ...(filters.search && { menuItem: { nom: { contains: filters.search, mode: 'insensitive' } } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        include: STOCK_ITEM_INCLUDE,
        orderBy: { menuItem: { nom: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockItem.count({ where }),
    ]);

    const annotated = items.map((item) => ({ ...item, ...this.stockStatus.computeStatusFor(item) }));
    // Filtre par statut appliqué après calcul (le statut n'est pas une colonne stockée).
    const filtered = filters.status ? annotated.filter((i) => i.status === filters.status) : annotated;

    return {
      items: filtered,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id }, include: STOCK_ITEM_INCLUDE });
    if (!item) throw new AppException('STOCK_ITEM_NOT_FOUND', 'Fiche de stock introuvable', 404);
    return { ...item, ...this.stockStatus.computeStatusFor(item) };
  }

  private async assertSupplierExists(supplierId?: string) {
    if (!supplierId) return;
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new AppException('SUPPLIER_NOT_FOUND', 'Fournisseur introuvable', 404);
  }

  // §5.2 point 2 : création manuelle si l'auto-création (menu.item_created) n'a pas eu lieu
  async createForMenuItem(dto: CreateStockItemDto) {
    const menuItem = await this.prisma.menuItem.findUnique({ where: { id: dto.menuItemId } });
    if (!menuItem || menuItem.deleted) {
      throw new AppException('MENU_ITEM_NOT_FOUND', 'Article introuvable', 404);
    }

    const existing = await this.prisma.stockItem.findUnique({ where: { menuItemId: dto.menuItemId } });
    if (existing) {
      throw new AppException('STOCK_ITEM_ALREADY_EXISTS', 'Une fiche de stock existe déjà pour cet article', 409);
    }

    await this.assertSupplierExists(dto.supplierId);

    return this.prisma.stockItem.create({
      data: {
        menuItemId: dto.menuItemId,
        supplierId: dto.supplierId,
        targetStock: dto.targetStock ?? 0,
        currentStock: dto.initialStock ?? 0,
      },
      include: STOCK_ITEM_INCLUDE,
    });
  }

  // Auto-création silencieuse (listener menu.item_created) — best-effort, ne lève jamais
  // d'exception pour ne jamais bloquer la création de l'article catalogue.
  async ensureStockItemExists(menuItemId: string) {
    const existing = await this.prisma.stockItem.findUnique({ where: { menuItemId } });
    if (existing) return existing;
    return this.prisma.stockItem.create({ data: { menuItemId, currentStock: 0, targetStock: 0 } });
  }

  async updateItem(id: string, dto: UpdateStockItemDto) {
    const existing = await this.getById(id);
    await this.assertSupplierExists(dto.supplierId);

    if (dto.targetStock !== undefined && dto.targetStock < 0) {
      throw new AppException('INVALID_TARGET_STOCK', 'Le stock cible ne peut pas être négatif', 400);
    }

    const beforeStatus = this.stockStatus.computeStatusFor(existing);

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: {
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.targetStock !== undefined && { targetStock: dto.targetStock }),
      },
      include: STOCK_ITEM_INCLUDE,
    });

    await this.stockStatus.handleStatusChange(beforeStatus, updated);
    return updated;
  }

  // §13.1 : seuils vert/orange par article — Super Admin uniquement (RBAC au controller)
  async updateItemThresholds(id: string, dto: UpdateThresholdsDto) {
    const existing = await this.getById(id);
    this.assertThresholdsCoherent(dto.greenThresholdPct, dto.orangeThresholdPct);

    const beforeStatus = this.stockStatus.computeStatusFor(existing);

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: { greenThresholdPct: dto.greenThresholdPct, orangeThresholdPct: dto.orangeThresholdPct },
      include: STOCK_ITEM_INCLUDE,
    });

    await this.stockStatus.handleStatusChange(beforeStatus, updated);
    return updated;
  }

  // Seuils par catégorie (§5.2 : "par article ou par catégorie") — s'applique à tous les
  // articles de la catégorie qui n'ont pas de seuil propre (fallback, voir resolveThresholds).
  async updateCategoryThresholds(categorieId: string, dto: UpdateThresholdsDto) {
    const category = await this.prisma.category.findUnique({ where: { id: categorieId } });
    if (!category) throw new AppException('CATEGORY_NOT_FOUND', 'Catégorie introuvable', 404);

    this.assertThresholdsCoherent(dto.greenThresholdPct, dto.orangeThresholdPct);

    const affectedItems = await this.prisma.stockItem.findMany({
      where: { menuItem: { categorieId } },
      include: STOCK_ITEM_INCLUDE,
    });
    const beforeStatuses = affectedItems.map((item) => this.stockStatus.computeStatusFor(item));

    await this.prisma.category.update({
      where: { id: categorieId },
      data: { greenThresholdPct: dto.greenThresholdPct, orangeThresholdPct: dto.orangeThresholdPct },
    });

    // Ré-évalue chaque article de la catégorie individuellement — certains ont peut-être
    // leur propre seuil, qui prime toujours sur celui de la catégorie.
    for (let i = 0; i < affectedItems.length; i++) {
      const refreshed = await this.prisma.stockItem.findUnique({
        where: { id: affectedItems[i].id },
        include: STOCK_ITEM_INCLUDE,
      });
      if (refreshed) {
        await this.stockStatus.handleStatusChange(beforeStatuses[i], refreshed);
      }
    }

    return this.prisma.category.findUnique({ where: { id: categorieId } });
  }

  private assertThresholdsCoherent(green: number, orange: number) {
    if (green <= orange) {
      throw new AppException(
        'INVALID_THRESHOLDS',
        'greenThresholdPct doit être strictement supérieur à orangeThresholdPct',
        400,
      );
    }
  }
}