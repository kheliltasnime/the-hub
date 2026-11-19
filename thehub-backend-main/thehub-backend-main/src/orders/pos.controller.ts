import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProfileGuard } from '../common/guards/profile.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateWalkInOrderDto } from './dto/create-walkin-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { SyncPosQueueDto } from './dto/sync-queue.dto';
@Controller('pos')
@UseGuards(JwtAuthGuard, ProfileGuard)
@Roles(Role.pos_caissier, Role.pos_manager)
export class PosController {
  constructor(private readonly orderService: OrderService) {}

  // POST /pos/orders/walk-in — commande comptoir, sans compte client 
  @Post('orders/walk-in')
  createWalkInOrder(@Req() req: any, @Body() dto: CreateWalkInOrderDto) {
    return this.orderService.createWalkInOrder(req.user.enseigneId, req.user.sub, dto);
  }

  // POST /pos/orders/:id/scan-qr — validation du QR de récupération à la caisse
  @Post('orders/:id/scan-qr')
  scanQr(@Param('id') orderId: string, @Body() body: { qrToken: string }) {
    return this.orderService.collectOrder(orderId, body.qrToken);
  }
  // POST /pos/orders/:id/pay — encaissement (espèces/carte/virement/wallet)
@Post('orders/:id/pay')
payOrder(@Req() req: any, @Param('id') orderId: string, @Body() dto: PayOrderDto) {
  return this.orderService.payOrder(orderId, req.user.sub, req.user.role, dto);
}

// POST /pos/sync-queue — rejeu des actions faites hors-ligne (CDC : "sync automatique au retour connexion")
// POST /pos/sync-queue — ...
@Post('sync-queue')
syncQueue(@Req() req: any, @Body() dto: SyncPosQueueDto) {
  return this.orderService.syncPosQueue(dto.actions as any, req.user.enseigneId, req.user.sub, req.user.role);
}

}