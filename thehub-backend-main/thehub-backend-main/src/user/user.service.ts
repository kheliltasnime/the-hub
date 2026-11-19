import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    password: string;
    fullName: string;
    profileType: 'etudiant' | 'professionnel';
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        profileType: data.profileType,
      },
    });
  }

  async me(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new AppException('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
    }
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      profileType: user.profileType,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  // ---------- OAuth (Google / Apple) ----------

  findByOauthId(provider: 'google' | 'apple', oauthId: string) {
    return this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthId },
    });
  }

  linkOauth(userId: string, provider: 'google' | 'apple', oauthId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { oauthProvider: provider, oauthId },
    });
  }

  createFromOauth(data: {
    email: string;
    fullName: string;
    oauthProvider: 'google' | 'apple';
    oauthId: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        oauthProvider: data.oauthProvider,
        oauthId: data.oauthId,
        profileType: 'etudiant',
      },
    });
  }

  async setPushToken(userId: string, fcmToken: string) {
  await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
}
}