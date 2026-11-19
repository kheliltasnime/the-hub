import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listByEnseigne(enseigneId: string) {
    return this.prisma.category.findMany({
      where: { enseigneId },
      orderBy: { ordre: 'asc' },
    });
  }

  async getById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppException('CATEGORY_NOT_FOUND', 'Catégorie introuvable', 404);
    }
    return category;
  }

  // §6.2 : "Créer / renommer / supprimer des onglets de catégorie par enseigne"
  async create(dto: CreateCategoryDto) {
    const enseigne = await this.prisma.enseigne.findUnique({ where: { id: dto.enseigneId } });
    if (!enseigne) {
      throw new AppException('ENSEIGNE_NOT_FOUND', 'Enseigne introuvable', 404);
    }

    const maxOrdre = await this.prisma.category.aggregate({
      where: { enseigneId: dto.enseigneId },
      _max: { ordre: true },
    });

    try {
      const category = await this.prisma.category.create({
        data: {
          enseigneId: dto.enseigneId,
          nom: dto.nom,
          ordre: (maxOrdre._max.ordre ?? -1) + 1,
        },
      });

      this.eventEmitter.emit('menu.category_updated', { enseigneId: dto.enseigneId });
      return category;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException('CATEGORY_NAME_TAKEN', 'Une catégorie avec ce nom existe déjà pour cette enseigne', 409);
      }
      throw err;
    }
  }

  async rename(id: string, dto: UpdateCategoryDto) {
    const category = await this.getById(id);

    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: { nom: dto.nom },
      });

      this.eventEmitter.emit('menu.category_updated', { enseigneId: category.enseigneId });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException('CATEGORY_NAME_TAKEN', 'Une catégorie avec ce nom existe déjà pour cette enseigne', 409);
      }
      throw err;
    }
  }

  async delete(id: string) {
    const category = await this.getById(id);

    const itemsCount = await this.prisma.menuItem.count({
      where: { categorieId: id, deleted: false },
    });
    if (itemsCount > 0) {
      throw new AppException(
        'CATEGORY_NOT_EMPTY',
        `Impossible de supprimer : ${itemsCount} article(s) encore rattaché(s) à cette catégorie. Déplacez-les ou supprimez-les d'abord.`,
        409,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.eventEmitter.emit('menu.category_updated', { enseigneId: category.enseigneId });
    return { id, deleted: true };
  }

  // Drag & drop — réordonnancement des onglets de catégories (§6.2)
  async reorder(enseigneId: string, dto: ReorderCategoriesDto) {
    const existing = await this.prisma.category.findMany({
      where: { enseigneId, id: { in: dto.categoryIds } },
      select: { id: true },
    });

    if (existing.length !== dto.categoryIds.length) {
      throw new AppException(
        'INVALID_CATEGORY_LIST',
        "La liste fournie contient des catégories introuvables ou n'appartenant pas à cette enseigne",
        400,
      );
    }

    await this.prisma.$transaction(
      dto.categoryIds.map((id, index) =>
        this.prisma.category.update({ where: { id }, data: { ordre: index } }),
      ),
    );

    this.eventEmitter.emit('menu.category_updated', { enseigneId });
    return this.listByEnseigne(enseigneId);
  }
}