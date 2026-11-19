import { Module } from '@nestjs/common';
import { WalletGatewayService } from './wallet-gateway.service';
import { WalletSandboxController } from './wallet-sandbox.controller';
import { WalletSandboxStore } from './wallet-sandbox.store';
import { WalletController } from './wallet.controller';
import { WalletWebhookController } from './wallet-webhook.controller';
import { RedisModule } from '../common/redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RedisModule, PrismaModule, AuthModule],
  controllers: [WalletSandboxController, WalletController, WalletWebhookController],
  providers: [WalletSandboxStore, WalletGatewayService],
  exports: [WalletGatewayService],
})
export class WalletGatewayModule {}
