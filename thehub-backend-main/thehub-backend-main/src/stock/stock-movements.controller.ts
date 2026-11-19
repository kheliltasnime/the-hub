import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

const STOCK_ROLES = [Role.super_admin, Role.manager_fnb] as const;

@ApiTags('Stock — Mouvements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STOCK_ROLES)
@Controller('admin/stock/:itemId/movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer une entrée fournisseur ou un ajustement manuel (motif obligatoire)' })
  create(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: CreateStockMovementDto) {
    return this.stockMovementsService.createManualMovement(req.user.sub, itemId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Historique des mouvements (paginé, filtrable) — §5.2' })
  list(@Param('itemId') itemId: string, @Query() query: GetStockMovementsDto) {
    return this.stockMovementsService.listMovements(itemId, query);
  }
}