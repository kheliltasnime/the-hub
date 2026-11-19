import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CoworkingController } from './coworking.controller';
import { CoworkingService } from './coworking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { BullModule } from '@nestjs/bullmq';
import { CoworkingGateway } from './coworking.gateway';
import { ReminderProcessor } from './reminder.processor';
import { parseRedisUrl } from '../common/redis/parse-redis-url';
import { COWORKING_REMINDERS_QUEUE } from './reminder-queue.constants';
import { WalletGatewayModule } from '../wallet-gateway/wallet-gateway.module';

@Module({
  imports: [
    PrismaModule,
    WalletGatewayModule,
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL as string),
    }),
    BullModule.registerQueue({
    name: COWORKING_REMINDERS_QUEUE,
  }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [CoworkingController],
  providers: [
    CoworkingService,
    ReminderSchedulerService,
    CoworkingGateway,
    ReminderProcessor
  ]
  ,
})
export class CoworkingModule {}