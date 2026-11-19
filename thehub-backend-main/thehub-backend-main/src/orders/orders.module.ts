import { Module } from '@nestjs/common';
import { OrderController } from './orders.controller';
import { KdsController } from './kds.controller';
import { PosController } from './pos.controller';
import { OrderService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { WalletGatewayModule } from '../wallet-gateway/wallet-gateway.module';
import { TrackingGateway } from './tracking.gateway';
import { ProfileGuard } from '../common/guards/profile.guard';

@Module({
  imports: [AuthModule, WalletGatewayModule],
  controllers: [OrderController, KdsController, PosController],
  providers: [OrderService, TrackingGateway, ProfileGuard],
})
export class OrderModule {}