import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { StockItemsController } from './stock-items.controller';
import { StockItemsService } from './stock-items.service';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockStatusService } from './stock-status.service';
import { StockOrderConsumptionListener } from './stock-order-consumption.listener';
import { MenuItemCreatedListener } from './menu-item-created.listener';
import { StockRealtimeGateway } from './stock-realtime.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ], // JwtService supposé global (JwtCoreModule) — sinon réimporter JwtModule ici
  controllers: [SuppliersController, StockItemsController, StockMovementsController],
  providers: [
    SuppliersService,
    StockItemsService,
    StockMovementsService,
    StockStatusService,
    StockOrderConsumptionListener,
    MenuItemCreatedListener,
    StockRealtimeGateway,
  ],
})
export class StockModule {}