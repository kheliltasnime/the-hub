import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

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

  // --- Refresh tokens ---
  async storeRefreshToken(token: string) {
    await this.client.set(
      `refresh:${token}`,
      'valid',
      'EX',
      this.REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  async isRefreshTokenValid(token: string): Promise<boolean> {
    const value = await this.client.get(`refresh:${token}`);
    return value === 'valid';
  }

  async revokeRefreshToken(token: string) {
    await this.client.del(`refresh:${token}`);
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

async isWalletCircuitOpen(): Promise<boolean> {
  const open = await this.client.get('wallet:circuit_open');
  return open === '1';
}

async registerWalletFailure(): Promise<void> {
  const current = await this.client.incr('wallet:failures');
  if (current === 1) {
    // Fenêtre de comptage : 5 échecs en 30 secondes déclenchent l'ouverture
    await this.client.expire('wallet:failures', 30);
  }
  if (current >= 5) {
    // Mode dégradé : 60 secondes, indépendamment de la fenêtre de comptage
    await this.client.set('wallet:circuit_open', '1', 'EX', 60);
    await this.client.del('wallet:failures'); // repart à zéro pour la prochaine fenêtre
  }
}

async resetWalletFailures(): Promise<void> {
  await this.client.del('wallet:failures');
  await this.client.del('wallet:circuit_open');
}
 


}