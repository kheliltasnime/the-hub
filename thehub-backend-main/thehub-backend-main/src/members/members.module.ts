import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MembersService } from './members.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MembersController } from './members.controller';
import { WalletGatewayModule } from 'src/wallet-gateway/wallet-gateway.module';

@Module({
  imports: [
    PrismaModule,
    WalletGatewayModule, // nécessaire pour l'injection de WalletGatewayService
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}