import {
  Controller, HttpCode, Post, Req, UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('wallet')
export class WalletWebhookController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const signature = req.headers['x-wallet-signature'] as string | undefined;
    const secret = process.env.WALLET_SECRET_KEY as string;
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature ?? '', 'utf8');

    // Comparaison timing-safe obligatoire — jamais === (vulnérable aux timing attacks), conforme CDC §4.3
    const isValid =
      expectedBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    if (!isValid) {
      throw new UnauthorizedException('Signature webhook invalide');
    }

    const body = JSON.parse(rawBody || '{}');
    this.eventEmitter.emit('wallet.webhook_received', {
      userId: body.userId ?? 'unknown',
      entityId: body.transactionId,
      metadata: { eventType: body.eventType },
    });

    return { received: true };
  }
}