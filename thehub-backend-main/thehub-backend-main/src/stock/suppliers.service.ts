import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { GetSuppliersDto } from './dto/get-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: GetSuppliersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.SupplierWhereInput = {
      ...(filters.search && { nom: { contains: filters.search, mode: 'insensitive' } }),
    };

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: { nom: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);

    return { suppliers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new AppException('SUPPLIER_NOT_FOUND', 'Fournisseur introuvable', 404);
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.getById(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.getById(id);

    const inUse = await this.prisma.stockItem.count({ where: { supplierId: id } });
    if (inUse > 0) {
      throw new AppException(
        'SUPPLIER_IN_USE',
        `Impossible de supprimer : ${inUse} fiche(s) de stock encore rattachée(s) à ce fournisseur`,
        409,
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { id, deleted: true };
  }
}