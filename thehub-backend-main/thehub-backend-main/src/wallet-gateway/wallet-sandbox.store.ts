import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

interface Transaction {
  transactionId: string;
  type: 'debit' | 'topup' | 'refund';
  amount: number;
  balanceAfter: number;
  timestamp: string;
}

/**
 * Store in-memory du wallet sandbox.
 * Évite les self-HTTP `localhost:3000 → /wallet-sandbox` qui bloquent
 * le event-loop Nest (la réservation ne créait jamais la ligne en DB).
 */
@Injectable()
export class WalletSandboxStore {
  private readonly accounts = new Map<string, number>();
  private readonly transactionsLog = new Map<string, Transaction[]>();
  private readonly processedIdempotencyKeys = new Map<string, string>();
  private readonly defaultBalance = 500;

  verifySignature(rawBody: string, timestamp: string, signature: string) {
    const secret = process.env.WALLET_SECRET_KEY as string;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}:${rawBody}`)
      .digest('hex');
    if (expected !== signature) {
      throw new UnauthorizedException('Signature invalide');
    }
  }

  getBalance(walletReferenceId: string) {
    const balance = this.accounts.get(walletReferenceId) ?? this.defaultBalance;
    this.accounts.set(walletReferenceId, balance);
    return { balance };
  }

  debit(walletReferenceId: string, amount: number, idempotencyKey: string) {
    const existingTransactionId = this.processedIdempotencyKeys.get(idempotencyKey);
    if (existingTransactionId) {
      return { transactionId: existingTransactionId };
    }

    const balance = this.accounts.get(walletReferenceId) ?? this.defaultBalance;
    if (balance < amount) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_BALANCE',
        message: 'Solde insuffisant',
      });
    }

    const newBalance = balance - amount;
    this.accounts.set(walletReferenceId, newBalance);
    const transactionId = crypto.randomUUID();
    this.processedIdempotencyKeys.set(idempotencyKey, transactionId);
    this.recordTransaction(walletReferenceId, {
      transactionId,
      type: 'debit',
      amount,
      balanceAfter: newBalance,
      timestamp: new Date().toISOString(),
    });
    return { transactionId };
  }

  topup(walletReferenceId: string, amount: number) {
    const balance = this.accounts.get(walletReferenceId) ?? this.defaultBalance;
    const newBalance = balance + amount;
    this.accounts.set(walletReferenceId, newBalance);
    const transactionId = crypto.randomUUID();
    this.recordTransaction(walletReferenceId, {
      transactionId,
      type: 'topup',
      amount,
      balanceAfter: newBalance,
      timestamp: new Date().toISOString(),
    });
    return { transactionId, newBalance };
  }

  getQr() {
    return {
      qrToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  getTransactions(walletReferenceId: string) {
    return { transactions: this.transactionsLog.get(walletReferenceId) ?? [] };
  }

  refund(walletReferenceId: string, amount: number) {
    const balance = this.accounts.get(walletReferenceId) ?? this.defaultBalance;
    const newBalance = balance + amount;
    this.accounts.set(walletReferenceId, newBalance);
    const transactionId = crypto.randomUUID();
    this.recordTransaction(walletReferenceId, {
      transactionId,
      type: 'refund',
      amount,
      balanceAfter: newBalance,
      timestamp: new Date().toISOString(),
    });
    return { transactionId, newBalance };
  }

  private recordTransaction(walletReferenceId: string, tx: Transaction) {
    const list = this.transactionsLog.get(walletReferenceId) ?? [];
    list.push(tx);
    this.transactionsLog.set(walletReferenceId, list);
  }
}
