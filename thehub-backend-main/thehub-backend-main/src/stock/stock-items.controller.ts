import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StockItemsService } from './stock-items.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { UpdateThresholdsDto } from './dto/update-thresholds.dto';
import { GetStockItemsDto } from './dto/get-stock-items.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

const STOCK_ROLES = [Role.super_admin, Role.manager_fnb] as const;
// §13.1 : seuils vert/orange/rouge réservés Super Admin (nuance RBAC déjà discutée)
const THRESHOLD_ROLES = [Role.super_admin] as const;

@ApiTags('Stock — Niveaux')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/stock')
export class StockItemsController {
  constructor(private readonly stockItemsService: StockItemsService) {}

  @Get()
  @Roles(...STOCK_ROLES)
  @ApiOperation({ summary: 'Niveaux de stock + statut par article (§5.2)' })
  list(@Query() query: GetStockItemsDto) {
    return this.stockItemsService.listItems(query);
  }

  @Post('items')
  @Roles(...STOCK_ROLES)
  @ApiOperation({ summary: "Créer manuellement une fiche de stock pour un article" })
  create(@Body() dto: CreateStockItemDto) {
    return this.stockItemsService.createForMenuItem(dto);
  }

  // Déclaré AVANT ':id' pour ne pas être capturé par le paramètre dynamique.
  @Patch('categories/:categorieId/thresholds')
  @Roles(...THRESHOLD_ROLES)
  @ApiOperation({ summary: 'Configurer les seuils vert/orange par catégorie — Super Admin (§13.1)' })
  updateCategoryThresholds(@Param('categorieId') categorieId: string, @Body() dto: UpdateThresholdsDto) {
    return this.stockItemsService.updateCategoryThresholds(categorieId, dto);
  }

  @Get(':id')
  @Roles(...STOCK_ROLES)
  @ApiOperation({ summary: "Détail d'une fiche de stock" })
  getById(@Param('id') id: string) {
    return this.stockItemsService.getById(id);
  }

  @Patch(':id')
  @Roles(...STOCK_ROLES)
  @ApiOperation({ summary: 'Modifier fournisseur / stock cible' })
  update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return this.stockItemsService.updateItem(id, dto);
  }

  @Patch(':id/thresholds')
  @Roles(...THRESHOLD_ROLES)
  @ApiOperation({ summary: 'Configurer les seuils vert/orange par article — Super Admin (§13.1)' })
  updateThresholds(@Param('id') id: string, @Body() dto: UpdateThresholdsDto) {
    return this.stockItemsService.updateItemThresholds(id, dto);
  }
}