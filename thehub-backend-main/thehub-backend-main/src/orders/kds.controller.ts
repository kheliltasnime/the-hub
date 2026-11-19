import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProfileGuard } from '../common/guards/profile.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AppException } from '../common/app.exception';
import { SyncKdsQueueDto } from './dto/sync-queue.dto';

@Controller('kds')
@UseGuards(JwtAuthGuard, ProfileGuard)
@Roles(Role.kds_chef, Role.kds_equipier, Role.kds_manager)
export class KdsController {
  constructor(private readonly orderService: OrderService) {}

  // GET /kds/:enseigne/orders — file d'attente cuisine (statuts RECUE/EN_PREPARATION/PRETE)
  @Get(':enseigne/orders')
  getQueue(@Req() req: any, @Param('enseigne') enseigneId: string) {
    // Équipier/chef : uniquement leur propre enseigne. Manager RDC : toutes, lecture seule.
    if (req.user.role !== Role.kds_manager && enseigneId !== req.user.enseigneId) {
      throw new AppException('FORBIDDEN', 'Accès limité à votre propre enseigne', 403);
    }
    return this.orderService.getKdsQueue(enseigneId);
  }

  // PATCH /kds/orders/:id/status — changement de statut d'une commande côté cuisine
  @Patch('orders/:id/status')
  updateStatus(@Param('id') orderId: string, @Body() dto: { statut: string; reason?: string }) {
    return this.orderService.updateOrderStatus(orderId, dto.statut as any, dto.reason);
  }

  // GET /kds/:enseigne/rush-status — statut de charge actuel de l'enseigne
@Get(':enseigne/rush-status')
getRushStatus(@Req() req: any, @Param('enseigne') enseigneId: string) {
  if (req.user.role !== Role.kds_manager && enseigneId !== req.user.enseigneId) {
    throw new AppException('FORBIDDEN', 'Accès limité à votre propre enseigne', 403);
  }
  return this.orderService.getRushStatus(enseigneId);
}

// POST /kds/sync-queue — rejeu des actions faites hors-ligne (CDC : "sync automatique au retour connexion")
@Post('sync-queue')
syncQueue(@Req() req: any, @Body() dto: SyncKdsQueueDto) {
  return this.orderService.syncKdsQueue(dto.actions, req.user.enseigneId, req.user.role === Role.kds_manager);
}

}