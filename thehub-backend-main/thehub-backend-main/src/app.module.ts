import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { envValidationSchema } from './config/env.validation';
import { OrderModule } from './orders/orders.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from './analytics/analytics.module';
import { WalletGatewayModule } from './wallet-gateway/wallet-gateway.module';
import { NotificationModule } from './common/notifications/notification.module';
import { CoworkingModule } from './coworking/coworking.module';
import { MembersModule } from './members/members.module';
import { CatalogModule } from './catalog/catalog.module';
import { StockModule } from './stock/stock.module';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UserModule,
    AuthModule,
    OrderModule,
    RedisModule,
     AnalyticsModule,
     WalletGatewayModule,
      NotificationModule,
      CoworkingModule,
    MembersModule,
    CatalogModule,
    StockModule,
    AdminModule,
    
  ],
 providers: [
  {
    provide: APP_GUARD,
    useClass: UserThrottlerGuard,
    
    
  },
],
})
export class AppModule {}
