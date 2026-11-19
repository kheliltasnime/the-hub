import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisMockService {
  private refreshTokens = new Set<string>();
  private pinFailedAttempts = new Map<string, { count: number; lockedUntil?: number }>();

  storeRefreshToken(token: string) {
    this.refreshTokens.add(token);
  }

  isRefreshTokenValid(token: string) {
    return this.refreshTokens.has(token);
  }

  revokeRefreshToken(token: string) {
    this.refreshTokens.delete(token);
  }

  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000;

  isDeviceLocked(deviceId: string): boolean {
    const entry = this.pinFailedAttempts.get(deviceId);
    if (!entry?.lockedUntil) return false;
    if (Date.now() > entry.lockedUntil) {
      this.pinFailedAttempts.delete(deviceId);
      return false;
    }
    return true;
  }

  registerFailedAttempt(deviceId: string) {
    const entry = this.pinFailedAttempts.get(deviceId) ?? { count: 0 };
    entry.count += 1;
    if (entry.count >= this.MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + this.LOCK_DURATION_MS;
    }
    this.pinFailedAttempts.set(deviceId, entry);
  }

  clearFailedAttempts(deviceId: string) {
    this.pinFailedAttempts.delete(deviceId);
  }
  
}