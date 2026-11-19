import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (admin.apps.length > 0) return; // évite une double initialisation en mode watch

    const rawCredentials = process.env.FIREBASE_CREDENTIALS?.trim();
    if (!rawCredentials) {
      this.logger.warn('Firebase désactivé : FIREBASE_CREDENTIALS absent');
      return;
    }

    try {
      const credentials = JSON.parse(rawCredentials);
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
    } catch {
      this.logger.warn('Firebase désactivé : FIREBASE_CREDENTIALS invalide');
    }
  }

  // N'échoue JAMAIS bruyamment : un push raté ne doit jamais faire échouer
  // l'action métier qui l'a déclenché (même principe que wallet_audit_log).
  async sendPush(userId: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.fcmToken) return; // pas de token enregistré, silencieux

      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data,
      });
    } catch (err) {
      this.logger.error(`Echec envoi push a l'utilisateur ${userId}`, err as Error);
    }
  }
}