import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './orders.service';
import { SearchMenuDto } from './dto/search-menu.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('enseignes')
  getEnseignes() {
    return this.orderService.getEnseignes();
  }

  @Get('menu/:enseigne')
  getMenu(@Param('enseigne') enseigneId: string) {
    return this.orderService.getMenu(enseigneId);
  }

  @Get('menu/:enseigne/search')
  searchMenu(@Param('enseigne') enseigneId: string, @Query() query: SearchMenuDto) {
    return this.orderService.searchMenu(enseigneId, query.q);
  }

  @Get('cart')
  getCart(@Req() req: any) {
    return this.orderService.getCart(req.user.sub);
  }

  @Post('cart/add')
  addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    return this.orderService.addToCart(req.user.sub, dto);
  }

  @Patch('cart/item/:id')
  updateCartItem(
    @Req() req: any,
    @Param('id') menuItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.orderService.updateCartItem(req.user.sub, menuItemId, dto.quantite);
  }

  @Delete('cart/item/:id')
  removeCartItem(@Req() req: any, @Param('id') menuItemId: string) {
    return this.orderService.removeCartItem(req.user.sub, menuItemId);
  }

  @Delete('cart')
  clearCart(@Req() req: any) {
    return this.orderService.clearCart(req.user.sub);
  }

  @Post('checkout')
  checkout(@Req() req: any, @Body() dto: { creneauSouhaite?: string; confirmMalgreRush?: boolean }) {
    return this.orderService.checkout(req.user.sub, dto.creneauSouhaite, dto.confirmMalgreRush);
  }

  // Repli REST si le WebSocket est indisponible (CDC §6.3 : GET /orders/:id/status)
  @Get(':id/status')
  getStatus(@Req() req: any, @Param('id') orderId: string) {
    return this.orderService.getOrderStatus(req.user.sub, orderId);
  }

  // Route dédiée pour récupérer le QR (CDC §6.3 : GET /orders/:id/qr)
  @Get(':id/qr')
  getQr(@Req() req: any, @Param('id') orderId: string) {
    return this.orderService.getOrderQr(req.user.sub, orderId);
  }
}