import {
  BadRequestException, Body, Controller, Headers, Post, UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

interface Transaction {
  transactionId: string;
  type: 'debit' | 'topup';
  amount: number;
  balanceAfter: number;
  timestamp: string;
}

const accounts = new Map<string, number>();
const transactionsLog = new Map<string, Transaction[]>();
const processedIdempotencyKeys = new Map<string, string>();

function recordTransaction(walletReferenceId: string, tx: Transaction) {
  const list = transactionsLog.get(walletReferenceId) ?? [];
  list.push(tx);
  transactionsLog.set(walletReferenceId, list);
}

@Controller('wallet-sandbox')
export class WalletSandboxController {
  private verifySignature(rawBody: string, timestamp: string, signature: string) {
  const secret = process.env.WALLET_SECRET_KEY as string;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${rawBody}`)   // <-- deux-points, conforme CDC
    .digest('hex');
  if (expected !== signature) {
    throw new UnauthorizedException('Signature invalide');
  }
}

  @Post('balance')
  getBalance(
    @Body() body: { walletReferenceId: string },
    @Headers('x-timestamp') timestamp: string,
    @Headers('x-signature') signature: string,
  ) {
    this.verifySignature(JSON.stringify(body), timestamp, signature);
    const balance = accounts.get(body.walletReferenceId) ?? 100;
    accounts.set(body.walletReferenceId, balance);
    return { balance };
  }
@Post('debit')
debit(
  @Body() body: { walletReferenceId: string; amount: number; idempotencyKey: string },
  @Headers('x-timestamp') timestamp: string,
  @Headers('x-signature') signature: string,
) {
  this.verifySignature(JSON.stringify(body), timestamp, signature);

  // Idempotence : si cette clé a déjà été traitée, on rejoue le même résultat
  // sans débiter une deuxième fois — comportement attendu d'une vraie API de paiement.
  const existingTransactionId = processedIdempotencyKeys.get(body.idempotencyKey);
  if (existingTransactionId) {
    return { transactionId: existingTransactionId };
  }

  const balance = accounts.get(body.walletReferenceId) ?? 100;

  if (balance < body.amount) {
    throw new BadRequestException({ code: 'INSUFFICIENT_BALANCE', message: 'Solde insuffisant' });
  }

  const newBalance = balance - body.amount;
  accounts.set(body.walletReferenceId, newBalance);
  const transactionId = crypto.randomUUID();

  processedIdempotencyKeys.set(body.idempotencyKey, transactionId);

  recordTransaction(body.walletReferenceId, {
    transactionId, type: 'debit', amount: body.amount, balanceAfter: newBalance,
    timestamp: new Date().toISOString(),
  });
  return { transactionId };
}
  @Post('topup')
  topup(
    @Body() body: { walletReferenceId: string; amount: number },
    @Headers('x-timestamp') timestamp: string,
    @Headers('x-signature') signature: string,
  ) {
    this.verifySignature(JSON.stringify(body), timestamp, signature);
    const balance = accounts.get(body.walletReferenceId) ?? 100;
    const newBalance = balance + body.amount;
    accounts.set(body.walletReferenceId, newBalance);
    const transactionId = crypto.randomUUID();
    recordTransaction(body.walletReferenceId, {
      transactionId, type: 'topup', amount: body.amount, balanceAfter: newBalance,
      timestamp: new Date().toISOString(),
    });
    return { transactionId, newBalance };
  }

  @Post('qr')
  getQr(
    @Body() body: { walletReferenceId: string },
    @Headers('x-timestamp') timestamp: string,
    @Headers('x-signature') signature: string,
  ) {
    this.verifySignature(JSON.stringify(body), timestamp, signature);
    return {
      qrToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  @Post('transactions')
  getTransactions(
    @Body() body: { walletReferenceId: string },
    @Headers('x-timestamp') timestamp: string,
    @Headers('x-signature') signature: string,
  ) {
    this.verifySignature(JSON.stringify(body), timestamp, signature);
    return { transactions: transactionsLog.get(body.walletReferenceId) ?? [] };
  }

  @Post('refund')
refund(
  @Body() body: { walletReferenceId: string; amount: number; orderId: string },
  @Headers('x-timestamp') timestamp: string,
  @Headers('x-signature') signature: string,
) {
  this.verifySignature(JSON.stringify(body), timestamp, signature);
  const balance = accounts.get(body.walletReferenceId) ?? 100;
  const newBalance = balance + body.amount;
  accounts.set(body.walletReferenceId, newBalance);
  const transactionId = crypto.randomUUID();
  recordTransaction(body.walletReferenceId, {
    transactionId, type: 'refund' as any, amount: body.amount, balanceAfter: newBalance,
    timestamp: new Date().toISOString(),
  });
  return { transactionId, newBalance };
}
}