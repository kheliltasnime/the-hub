import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisService } from '../common/redis/redis.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminTabletAccountsController } from './admin-tablet-accounts.controller';
import { AdminTabletAccountsService } from './admin-tablet-accounts.service';
import { AdminTabletAuthController } from './admin-tablet-auth.controller';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminTabletAuthService } from './admin-tablet-auth.service';
import { AdminAuditLogService } from './admin-audit-log.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminAccountsController,
    AdminTabletAccountsController,
    AdminTabletAuthController,
    AdminAuditLogController,
  ],
  providers: [
    AdminAuthService,
    AdminAccountsService,
    AdminTabletAccountsService,
    AdminTabletAuthService,
    AdminAuditLogService,
    RedisService,
  ],
})
export class AdminModule {}