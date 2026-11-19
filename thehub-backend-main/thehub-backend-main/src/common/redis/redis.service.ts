import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  private readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

  async onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL as string);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // --- Refresh tokens (indexés par userId, valeur = hash bcrypt) ---
  async storeRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.client.set(
      `refresh:${userId}`,
      hash,
      'EX',
      this.REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  async isRefreshTokenValid(userId: string, refreshToken: string): Promise<boolean> {
    const hash = await this.client.get(`refresh:${userId}`);
    if (!hash) return false;
    return bcrypt.compare(refreshToken, hash);
  }

  async revokeRefreshToken(userId: string) {
    await this.client.del(`refresh:${userId}`);
  }

  // --- Compteur d'échecs PIN (device-bound) ---
  async isDeviceLocked(deviceId: string): Promise<boolean> {
    const locked = await this.client.get(`pin-lock:${deviceId}`);
    return locked === '1';
  }

  async registerFailedAttempt(deviceId: string) {
    const key = `pin-attempts:${deviceId}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, 30);
    }
    if (count >= this.MAX_ATTEMPTS) {
      await this.client.set(
        `pin-lock:${deviceId}`,
        '1',
        'EX',
        this.LOCK_DURATION_SECONDS,
      );
    }
  }

  async clearFailedAttempts(deviceId: string) {
    await this.client.del(`pin-attempts:${deviceId}`);
    await this.client.del(`pin-lock:${deviceId}`);
  }

  // À ajouter au sein de votre classe RedisService existante :

async isWalletCircuitOpen(): Promise<boolean> {
  const open = await this.client.get('wallet:circuit:open');
  return open === '1';
}

async registerWalletFailure(): Promise<void> {
  const current = await this.client.incr('wallet:failures');
  if (current === 1) {
    await this.client.expire('wallet:failures', 30); // fenêtre d'échecs, 30s
  }
  if (current >= 5) {
    // Circuit ouvert : mode dégradé pendant 60s, conforme CDC §4.2
    await this.client.set('wallet:circuit:open', '1', 'EX', 60);
  }
}

async resetWalletFailures(): Promise<void> {
  await this.client.del('wallet:failures');
  await this.client.del('wallet:circuit:open');
}

async getCachedWalletBalance(walletReferenceId: string): Promise<number | null> {
  const balance = await this.client.get(`wallet:balance:${walletReferenceId}`);
  return balance !== null ? Number(balance) : null;
}

async setCachedWalletBalance(walletReferenceId: string, balance: number, ttlSeconds: number): Promise<void> {
  await this.client.set(`wallet:balance:${walletReferenceId}`, balance.toString(), 'EX', ttlSeconds);
}

async invalidateCachedWalletBalance(walletReferenceId: string): Promise<void> {
  await this.client.del(`wallet:balance:${walletReferenceId}`);
}



// --- Pub/Sub (tracking temps réel) ---
async publish(channel: string, message: string) {
  await this.client.publish(channel, message);
}

getSubscriberClient(): Redis {
  return this.client.duplicate();
}
}

