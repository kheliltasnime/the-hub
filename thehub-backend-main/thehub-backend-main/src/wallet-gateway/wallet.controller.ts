import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WalletGatewayService } from './wallet-gateway.service';
import { TopupDto } from './dto/topup.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletGateway: WalletGatewayService) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(req.user.sub);
    const balance = await this.walletGateway.getBalance(walletReferenceId, req.user.sub);
    return { balance };
  }

  @Post('topup')
  async topup(@Req() req: any, @Body() dto: TopupDto) {
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(req.user.sub);
    return this.walletGateway.topup(walletReferenceId, dto.amount, req.user.sub);
  }

  @Get('qr')
  async getQr(@Req() req: any) {
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(req.user.sub);
    return this.walletGateway.getQrPay(walletReferenceId, req.user.sub);
  }

  @Get('transactions')
  async getTransactions(@Req() req: any) {
    const walletReferenceId = await this.walletGateway.getOrCreateWalletReferenceId(req.user.sub);
    const transactions = await this.walletGateway.getTransactions(walletReferenceId, req.user.sub);
    return { transactions };
  }
}