import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { GetSuppliersDto } from './dto/get-suppliers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

const STOCK_ROLES = [Role.super_admin, Role.manager_fnb] as const;

@ApiTags('Stock — Fournisseurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STOCK_ROLES)
@Controller('admin/stock/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des fournisseurs' })
  list(@Query() query: GetSuppliersDto) {
    return this.suppliersService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un fournisseur" })
  getById(@Param('id') id: string) {
    return this.suppliersService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un fournisseur' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un fournisseur' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un fournisseur (refusé si encore utilisé)' })
  delete(@Param('id') id: string) {
    return this.suppliersService.delete(id);
  }
}