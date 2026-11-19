import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateSupplementGroupDto } from './dto/create-supplement-group.dto';
import { UpdateSupplementGroupDto } from './dto/update-supplement-group.dto';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { UpdateSupplementDto } from './dto/update-supplement.dto';
import { AttachSupplementGroupsDto } from './dto/attach-supplement-groups.dto';

@Injectable()
export class SupplementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Groupes de suppléments — §6.2 "Création de groupes de suppléments
  // (sauces, et autres produits) avec règles min/max de sélection"
  // ============================================================

  async listGroups() {
    return this.prisma.supplementGroup.findMany({
      include: { supplements: true },
      orderBy: { nom: 'asc' },
    });
  }

  async getGroupById(id: string) {
    const group = await this.prisma.supplementGroup.findUnique({
      where: { id },
      include: { supplements: true },
    });
    if (!group) {
      throw new AppException('SUPPLEMENT_GROUP_NOT_FOUND', 'Groupe de suppléments introuvable', 404);
    }
    return group;
  }

  private assertMinMaxCoherent(minSelect: number, maxSelect: number) {
    if (minSelect > maxSelect) {
      throw new AppException('INVALID_MIN_MAX', 'minSelect ne peut pas être supérieur à maxSelect', 400);
    }
  }

  async createGroup(dto: CreateSupplementGroupDto) {
    this.assertMinMaxCoherent(dto.minSelect, dto.maxSelect);
    return this.prisma.supplementGroup.create({
      data: { nom: dto.nom, minSelect: dto.minSelect, maxSelect: dto.maxSelect },
    });
  }

  async updateGroup(id: string, dto: UpdateSupplementGroupDto) {
    const group = await this.getGroupById(id);
    const minSelect = dto.minSelect ?? group.minSelect;
    const maxSelect = dto.maxSelect ?? group.maxSelect;
    this.assertMinMaxCoherent(minSelect, maxSelect);

    return this.prisma.supplementGroup.update({
      where: { id },
      data: { ...(dto.nom && { nom: dto.nom }), minSelect, maxSelect },
    });
  }

  async deleteGroup(id: string) {
    await this.getGroupById(id);

    const attachedItemsCount = await this.prisma.menuItemSupplementGroup.count({ where: { groupId: id } });
    if (attachedItemsCount > 0) {
      throw new AppException(
        'SUPPLEMENT_GROUP_IN_USE',
        `Impossible de supprimer : ce groupe est encore utilisé par ${attachedItemsCount} article(s)`,
        409,
      );
    }

    await this.prisma.supplementGroup.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ============================================================
  // Suppléments individuels (ex: une sauce précise dans le groupe "Sauces")
  // ============================================================

  async createSupplement(groupId: string, dto: CreateSupplementDto) {
    await this.getGroupById(groupId);
    return this.prisma.supplement.create({
      data: { groupId, nom: dto.nom, prix: dto.prix, maxQuantite: dto.maxQuantite },
    });
  }

  async updateSupplement(id: string, dto: UpdateSupplementDto) {
    const supplement = await this.prisma.supplement.findUnique({ where: { id } });
    if (!supplement) {
      throw new AppException('SUPPLEMENT_NOT_FOUND', 'Supplément introuvable', 404);
    }

    return this.prisma.supplement.update({
      where: { id },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.prix !== undefined && { prix: dto.prix }),
        ...(dto.maxQuantite !== undefined && { maxQuantite: dto.maxQuantite }),
      },
    });
  }

  // Toggle plutôt que suppression pure — évite de casser l'historique des commandes
  // passées qui référencent ce supplément (même logique que MenuItem.disponible).
  async toggleSupplement(id: string) {
    const supplement = await this.prisma.supplement.findUnique({ where: { id } });
    if (!supplement) {
      throw new AppException('SUPPLEMENT_NOT_FOUND', 'Supplément introuvable', 404);
    }
    return this.prisma.supplement.update({
      where: { id },
      data: { isActive: !supplement.isActive },
    });
  }

  // ============================================================
  // Association groupe(s) ↔ article
  // ============================================================

  async attachGroupsToItem(menuItemId: string, dto: AttachSupplementGroupsDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!item || item.deleted) {
      throw new AppException('MENU_ITEM_NOT_FOUND', 'Article introuvable', 404);
    }

    if (dto.groupIds.length > 0) {
      const found = await this.prisma.supplementGroup.count({ where: { id: { in: dto.groupIds } } });
      if (found !== dto.groupIds.length) {
        throw new AppException('INVALID_GROUP_LIST', 'Un ou plusieurs groupes de suppléments sont introuvables', 400);
      }
    }

    // Remplace intégralement la liste des groupes associés (delete + recreate en transaction).
    await this.prisma.$transaction([
      this.prisma.menuItemSupplementGroup.deleteMany({ where: { menuItemId } }),
      this.prisma.menuItemSupplementGroup.createMany({
        data: dto.groupIds.map((groupId) => ({ menuItemId, groupId })),
      }),
    ]);

    return this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { supplementGroups: { include: { group: { include: { supplements: true } } } } },
    });
  }
}