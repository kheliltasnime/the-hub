import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { WalletSandboxStore } from './wallet-sandbox.store';

const BALANCE_CACHE_TTL_SECONDS = 30;
const RETRY_DELAYS_MS = [1000, 3000, 9000];
const FETCH_TIMEOUT_MS = 8000;

@Injectable()
export class WalletGatewayService {
  private readonly logger = new Logger(WalletGatewayService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly sandbox: WalletSandboxStore,
  ) {}

  private isSandboxMode(): boolean {
    const url = process.env.WALLET_API_URL ?? '';
    return url.includes('wallet-sandbox');
  }

  private sign(payload: string, timestamp: string): string {
    const secret = process.env.WALLET_SECRET_KEY as string;
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}:${payload}`)
      .digest('hex');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logAudit(entry: {
    userId: string;
    walletReferenceId: string;
    action: string;
    montant?: number;
    statusCode: number;
    success: boolean;
    errorCode?: string;
  }) {
    try {
      await this.prisma.walletAuditLog.create({
        data: {
          userId: entry.userId,
          walletReferenceId: entry.walletReferenceId,
          action: entry.action,
          montant: entry.montant,
          statusCode: entry.statusCode,
          success: entry.success,
          errorCode: entry.errorCode,
        },
      });
    } catch (err) {
      this.logger.error(`Echec ecriture wallet_audit_log (${entry.action})`, err as Error);
    }
  }

  /** Appel in-process — évite le deadlock HTTP Nest → Nest sur localhost. */
  private requestSandbox(
    path: string,
    body: Record<string, any>,
  ): Record<string, any> {
    switch (path) {
      case '/balance':
        return this.sandbox.getBalance(body.walletReferenceId);
      case '/debit':
        return this.sandbox.debit(
          body.walletReferenceId,
          body.amount,
          body.idempotencyKey,
        );
      case '/topup':
        return this.sandbox.topup(body.walletReferenceId, body.amount);
      case '/qr':
        return this.sandbox.getQr();
      case '/transactions':
        return this.sandbox.getTransactions(body.walletReferenceId);
      case '/refund':
        return this.sandbox.refund(body.walletReferenceId, body.amount);
      default:
        throw new AppException('WALLET_ERROR', `Sandbox path inconnu: ${path}`, 500);
    }
  }

  private async request(
    path: string,
    body: Record<string, any>,
    audit: { userId: string; walletReferenceId: string; action: string; montant?: number },
  ) {
    if (await this.redis.isWalletCircuitOpen()) {
      await this.logAudit({
        ...audit,
        statusCode: 503,
        success: false,
        errorCode: 'WALLET_UNAVAILABLE',
      });
      throw new AppException(
        'WALLET_UNAVAILABLE',
        'Paiement temporairement indisponible, réessayez dans un instant',
        503,
      );
    }

    if (this.isSandboxMode()) {
      try {
        const data = this.requestSandbox(path, body);
        await this.redis.resetWalletFailures();
        await this.logAudit({ ...audit, statusCode: 200, success: true });
        return data;
      } catch (err) {
        if (err instanceof BadRequestException) {
          const response = err.getResponse() as any;
          const code = response?.code || 'WALLET_ERROR';
          const message = response?.message || 'Erreur du service de paiement';
          await this.redis.registerWalletFailure();
          await this.logAudit({
            ...audit,
            statusCode: 400,
            success: false,
            errorCode: code,
          });
          throw new AppException(code, message, 400);
        }
        throw err;
      }
    }

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const timestamp = Date.now().toString();
        const payload = JSON.stringify(body);
        const signature = this.sign(payload, timestamp);

        const res = await fetch(`${process.env.WALLET_API_URL}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': process.env.WALLET_API_KEY as string,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
          },
          body: payload,
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!res.ok) {
          await this.redis.registerWalletFailure();
          const errorBody = await res.json().catch(() => ({}));
          const errBody = (errorBody as any).error ?? errorBody;
          await this.logAudit({
            ...audit,
            statusCode: res.status,
            success: false,
            errorCode: errBody.code || 'WALLET_ERROR',
          });
          throw new AppException(
            errBody.code || 'WALLET_ERROR',
            errBody.message || 'Erreur du service de paiement',
            res.status,
          );
        }

        await this.redis.resetWalletFailures();
        await this.logAudit({ ...audit, statusCode: res.status, success: true });

        const json = await res.json();
        return (json as any).data ?? json;
      } catch (err) {
        if (err instanceof AppException) throw err;

        if (attempt < RETRY_DELAYS_MS.length) {
          await this.sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
      }
    }

    await this.redis.registerWalletFailure();
    await this.logAudit({
      ...audit,
      statusCode: 503,
      success: false,
      errorCode: 'WALLET_UNAVAILABLE',
    });
    throw new AppException(
      'WALLET_UNAVAILABLE',
      'Paiement temporairement indisponible, réessayez dans un instant',
      503,
    );
  }

  async getBalance(walletReferenceId: string, userId: string): Promise<number> {
    const cached = await this.redis.getCachedWalletBalance(walletReferenceId);
    if (cached !== null) return cached;

    const data = await this.request(
      '/balance',
      { walletReferenceId },
      { userId, walletReferenceId, action: 'balance' },
    );
    await this.redis.setCachedWalletBalance(
      walletReferenceId,
      data.balance,
      BALANCE_CACHE_TTL_SECONDS,
    );
    return data.balance;
  }

  async debit(
    walletReferenceId: string,
    amount: number,
    idempotencyKey: string,
    userId: string,
  ) {
    const data = await this.request(
      '/debit',
      { walletReferenceId, amount, idempotencyKey },
      { userId, walletReferenceId, action: 'debit', montant: amount },
    );
    await this.redis.invalidateCachedWalletBalance(walletReferenceId);
    return { transactionId: data.transactionId as string };
  }

  async getOrCreateWalletReferenceId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    if (user.walletReferenceId) return user.walletReferenceId;

    const walletReferenceId = crypto.randomUUID();
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletReferenceId },
    });
    return walletReferenceId;
  }

  async topup(walletReferenceId: string, amount: number, userId: string) {
    const data = await this.request(
      '/topup',
      { walletReferenceId, amount },
      { userId, walletReferenceId, action: 'topup', montant: amount },
    );
    await this.redis.invalidateCachedWalletBalance(walletReferenceId);
    return {
      transactionId: data.transactionId as string,
      newBalance: data.newBalance as number,
    };
  }

  async getQrPay(walletReferenceId: string, userId: string) {
    const data = await this.request(
      '/qr',
      { walletReferenceId },
      { userId, walletReferenceId, action: 'qr' },
    );
    return { qrToken: data.qrToken as string, expiresAt: data.expiresAt as string };
  }

  async getTransactions(walletReferenceId: string, userId: string) {
    const data = await this.request(
      '/transactions',
      { walletReferenceId },
      { userId, walletReferenceId, action: 'transactions' },
    );
    return data.transactions as any[];
  }

  async refund(
    walletReferenceId: string,
    amount: number,
    orderId: string,
    staffId: string,
  ) {
    const data = await this.request(
      '/refund',
      { walletReferenceId, amount, orderId },
      { userId: staffId, walletReferenceId, action: 'refund', montant: amount },
    );
    await this.redis.invalidateCachedWalletBalance(walletReferenceId);
    return {
      transactionId: data.transactionId as string,
      newBalance: data.newBalance as number,
    };
  }
}
