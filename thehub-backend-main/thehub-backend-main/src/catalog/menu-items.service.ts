import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto';
import { GetMenuItemsDto } from './dto/get-menu-items.dto';

// Statuts de commande considérés "actifs" — un article présent dans une commande
// à l'un de ces statuts ne peut pas être supprimé définitivement (§6.3 CDC fonctionnel).
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.RECUE,
  OrderStatus.EN_PREPARATION,
  OrderStatus.PRETE,
];

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo — §6.3

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(filters: GetMenuItemsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const where: Prisma.MenuItemWhereInput = {
      deleted: false,
      ...(filters.enseigneId && { enseigneId: filters.enseigneId }),
      ...(filters.categorieId && { categorieId: filters.categorieId }),
      ...(filters.includeUnavailable ? {} : { disponible: true }),
      ...(filters.search && { nom: { contains: filters.search, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        include: { categorie: true, supplementGroups: { include: { group: true } } },
        orderBy: [{ categorieId: 'asc' }, { ordre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { categorie: true, supplementGroups: { include: { group: { include: { supplements: true } } } } },
    });
    if (!item || item.deleted) {
      throw new AppException('MENU_ITEM_NOT_FOUND', 'Article introuvable', 404);
    }
    return item;
  }

  private async assertCategoryBelongsToEnseigne(categorieId: string, enseigneId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categorieId } });
    if (!category) {
      throw new AppException('CATEGORY_NOT_FOUND', 'Catégorie introuvable', 404);
    }
    if (category.enseigneId !== enseigneId) {
      throw new AppException(
        'CATEGORY_ENSEIGNE_MISMATCH',
        "Cette catégorie n'appartient pas à l'enseigne indiquée",
        400,
      );
    }
    return category;
  }

  private assertAvailabilityWindowValid(start?: string, end?: string) {
    // Les deux champs vont ensemble : soit aucun (dispo permanente), soit les deux.
    if ((start && !end) || (!start && end)) {
      throw new AppException(
        'INCOMPLETE_AVAILABILITY_WINDOW',
        'availabilityStart et availabilityEnd doivent être fournis ensemble',
        400,
      );
    }
    if (start && end && start >= end) {
      throw new AppException('INVALID_AVAILABILITY_WINDOW', 'availabilityStart doit être antérieur à availabilityEnd', 400);
    }
  }

  // §6.2 "Créer un article" — publication immédiate côté app mobile via l'event émis
  async create(dto: CreateMenuItemDto) {
    await this.assertCategoryBelongsToEnseigne(dto.categorieId, dto.enseigneId);
    this.assertAvailabilityWindowValid(dto.availabilityStart, dto.availabilityEnd);

    const maxOrdre = await this.prisma.menuItem.aggregate({
      where: { categorieId: dto.categorieId, deleted: false },
      _max: { ordre: true },
    });

    const item = await this.prisma.menuItem.create({
      data: {
        enseigneId: dto.enseigneId,
        categorieId: dto.categorieId,
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        photoUrl: dto.photoUrl,
        allergenes: dto.allergenes ?? [],
        availabilityStart: dto.availabilityStart,
        availabilityEnd: dto.availabilityEnd,
        ordre: (maxOrdre._max.ordre ?? -1) + 1,
      },
      include: { categorie: true },
    });

    this.emitItemUpdated(item.id, item.enseigneId);
    return item;
  }

  // §6.2 "Modifier un article" — édition inline/modal, publication immédiate
  async update(id: string, dto: UpdateMenuItemDto) {
    const existing = await this.getById(id);

    if (dto.categorieId) {
      await this.assertCategoryBelongsToEnseigne(dto.categorieId, existing.enseigneId);
    }

    const newStart = dto.availabilityStart ?? existing.availabilityStart ?? undefined;
    const newEnd = dto.availabilityEnd ?? existing.availabilityEnd ?? undefined;
    this.assertAvailabilityWindowValid(newStart, newEnd);

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.categorieId && { categorieId: dto.categorieId }),
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.prix !== undefined && { prix: dto.prix }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.allergenes && { allergenes: dto.allergenes }),
        ...(dto.availabilityStart !== undefined && { availabilityStart: dto.availabilityStart }),
        ...(dto.availabilityEnd !== undefined && { availabilityEnd: dto.availabilityEnd }),
      },
      include: { categorie: true },
    });

    // Modification prix → mise à jour temps réel, commandes en cours non affectées (§6.3) :
    // on ne touche jamais à OrderItem.prixUnitaire, qui a figé le prix au moment de la commande.
    this.emitItemUpdated(updated.id, updated.enseigneId);
    return updated;
  }

  // §6.2 "Désactiver temporairement" — toggle on/off, article grisé mais conservé en base
  async toggleAvailability(id: string) {
    const existing = await this.getById(id);

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: { disponible: !existing.disponible },
    });

    this.emitItemUpdated(updated.id, updated.enseigneId);
    return updated;
  }

  // §6.2/§6.3 "Supprimer un article" — soft delete, jamais de vrai DELETE SQL
  // (l'historique des commandes doit rester consultable — cf. note ouverte du CDC
  // "conservation de l'article supprimé sur la base de donnée ?", tranchée ici en soft delete).
  async remove(id: string) {
    await this.getById(id);

    const activeOrders = await this.prisma.order.findMany({
      where: {
        statut: { in: ACTIVE_ORDER_STATUSES },
        items: { some: { menuItemId: id } },
      },
      select: { id: true, statut: true },
    });

    if (activeOrders.length > 0) {
      throw new AppException(
        'MENU_ITEM_IN_ACTIVE_ORDERS',
        `Impossible de supprimer : cet article est présent dans ${activeOrders.length} commande(s) active(s) (${activeOrders.map((o) => o.id).join(', ')})`,409,
      );
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: { deleted: true, disponible: false },
    });

    this.emitItemUpdated(updated.id, updated.enseigneId, 'menu.item_deleted');
    return { id, deleted: true };
  }

  // §6.2 "Réordonner les articles" — drag & drop, ordre reflété dans l'app mobile
  async reorder(categorieId: string, dto: ReorderMenuItemsDto) {
    const existing = await this.prisma.menuItem.findMany({
      where: { categorieId, id: { in: dto.itemIds }, deleted: false },
      select: { id: true, enseigneId: true },
    });

    if (existing.length !== dto.itemIds.length) {
      throw new AppException(
        'INVALID_MENU_ITEM_LIST',
        "La liste fournie contient des articles introuvables ou n'appartenant pas à cette catégorie",
        400,
      );
    }

    await this.prisma.$transaction(
      dto.itemIds.map((id, index) => this.prisma.menuItem.update({ where: { id }, data: { ordre: index } })),
    );

    const enseigneId = existing[0]?.enseigneId;
    if (enseigneId) this.emitItemUpdated(null, enseigneId);

    return this.prisma.menuItem.findMany({
      where: { categorieId, deleted: false },
      orderBy: { ordre: 'asc' },
    });
  }

  validatePhotoSize(sizeBytes: number) {
    if (sizeBytes > MAX_PHOTO_SIZE_BYTES) {
      throw new AppException('PHOTO_TOO_LARGE', 'Taille max 5 Mo — compressez l\'image', 400);
    }
  }

  private emitItemUpdated(itemId: string | null, enseigneId: string, eventName = 'menu.item_updated') {
    // Relayé vers l'app mobile par la gateway WebSocket existante (comme
    // coworking.space_updated) — publication immédiate, <5s conforme §6.3.
    this.eventEmitter.emit(eventName, { itemId, enseigneId });
  }
}