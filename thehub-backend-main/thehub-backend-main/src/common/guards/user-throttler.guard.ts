import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const authHeader = req.headers?.authorization as string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        return `user:${payload.sub}`; // quota individuel par utilisateur connecté
      } catch {
        // Token invalide/expiré : on retombe sur l'IP ci-dessous.
        // JwtAuthGuard (exécuté après) se chargera de rejeter la requête si besoin.
      }
    }

    return req.ip; // routes publiques (login, register...) : throttling par IP, comme avant
  }
}