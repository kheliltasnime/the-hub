import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { UsersStore } from './users.store';
import { AppException } from '../common/app.exception';
import { UserService } from '../user/user.service';
import { RedisService } from '../common/redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const TABLET_SESSION_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UserService,
    private readonly usersStore: UsersStore,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
     private readonly prisma: PrismaService,
  ) {}
private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
 async onModuleInit() {
  if (process.env.NODE_ENV === 'production') return;

  const brew = await this.userService['prisma'].enseigne.findFirst({
    where: { nom: 'The Brew' },
  });

  if (!brew) {
    console.warn('Seed KDS ignoré : enseigne "The Brew" introuvable en base');
    return;
  }

  await this.seedTabletUser({
    pin: '1234',
    role: Role.kds_equipier,
    deviceId: 'tablette-kds-01',
    enseigneId: brew.id,
    fullName: 'Équipier Test',
  });

  await this.seedTabletUser({
    pin: '1234',
    email: 'chef.brew@thehubghazela.tn',
    role: Role.kds_chef,
    deviceId: 'tablette-kds-02',
    enseigneId: brew.id,
    fullName: 'Chef Test',
  });
  
 await this.seedTabletUser({
    pin: '123456',
    role: Role.pos_caissier,
    deviceId: 'pos-brew-01',
    enseigneId: brew.id,
    fullName: 'Caissier Test',
  });

  await this.seedTabletUser({
    pin: '999999',
    email: 'manager.brew@thehubghazela.tn',
    role: Role.pos_manager,
    deviceId: 'pos-manager-brew-01',
    enseigneId: brew.id,
    fullName: 'Manager Test',
  });
}

  async register(dto: RegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppException(
        'EMAIL_ALREADY_EXISTS',
        'Un compte existe déjà avec cet email',
        409,
      );
    }

    const user = await this.userService.create(dto);

     this.eventEmitter.emit('user.registered', {
    userId: user.id,
    metadata: { profileType: user.profileType },
  });


    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      profileType: user.profileType,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Email ou mot de passe incorrect',
        401,
      );
    }

    return this.issueUserSession(user.id, user.email, user.role);
  }

  // ---------- OAuth (Google / Apple) ----------
  // Le "provider" distingue la source ('google' | 'apple'), oauthId est l'identifiant
  // unique fourni par ce provider pour cet utilisateur.
  async oauthLogin(
    oauthUser: { oauthId: string; email: string; fullName: string },
    provider: 'google' | 'apple',
  ) {
    let user = await this.userService.findByOauthId(provider, oauthUser.oauthId);

    if (!user) {
      // Un compte existe peut-être déjà avec cet email (créé via mot de passe classique)
      const existingByEmail = await this.userService.findByEmail(oauthUser.email);

      if (existingByEmail) {
        user = await this.userService.linkOauth(
          existingByEmail.id,
          provider,
          oauthUser.oauthId,
        );
      } else {
        user = await this.userService.createFromOauth({
          email: oauthUser.email,
          fullName: oauthUser.fullName || oauthUser.email,
          oauthProvider: provider,
          oauthId: oauthUser.oauthId,
        });
      }
    }

    return this.issueUserSession(user.id, user.email, user.role);
  }
async oauthLoginWithIdToken(idToken: string, provider: 'google') {
  let payload;
  try {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new AppException('INVALID_CREDENTIALS', 'Token Google invalide ou expiré', 401);
  }

  if (!payload?.email) {
    throw new AppException(
      'INVALID_CREDENTIALS',
      "Impossible de récupérer l'email depuis le token Google",
      401,
    );
  }

  return this.oauthLogin(
    {
      oauthId: payload.sub,
      email: payload.email,
      fullName: payload.name ?? '',
    },
    provider,
  );
}
async refresh(refreshToken: string) {
  let payload: any;
  try {
    payload = await this.jwt.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  } catch {
    throw new AppException('INVALID_CREDENTIALS', 'Refresh token invalide ou expiré', 401);
  }

  const isValid = await this.redis.isRefreshTokenValid(payload.sub, refreshToken);
  if (!isValid) {
    throw new AppException('INVALID_CREDENTIALS', 'Refresh token invalide ou expiré', 401);
  }

  const accessToken = await this.jwt.signAsync(
    { sub: payload.sub, email: payload.email, role: payload.role },
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );

  return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

  async logout(userId: string) {
  await this.redis.revokeRefreshToken(userId);
  return { message: 'Déconnexion réussie' };
}

  private async issueUserSession(userId: string, email: string, role: Role) {
  const payload = { sub: userId, email, role };

  const accessToken = await this.jwt.signAsync(payload, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
  const refreshToken = await this.jwt.signAsync(payload, {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
  });

  await this.redis.storeRefreshTokenHash(userId, refreshToken);
this.eventEmitter.emit('user.logged_in', { userId });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: { userId, email, role },
  };
}

  async pinLogin(dto: PinLoginDto) {
    if (await this.redis.isDeviceLocked(dto.deviceId)) {
      throw new AppException(
        'DEVICE_LOCKED',
        'Appareil temporairement verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
        423,
      );
    }

    const tabletUser = this.usersStore
      .listTabletUsers()
      .find((u) => u.deviceId === dto.deviceId);

    const pinMatches = tabletUser
      ? await bcrypt.compare(dto.pin, tabletUser.pinHash)
      : false;

    const emailMatches =
      tabletUser && tabletUser.role === Role.kds_chef
        ? dto.email === tabletUser.email
        : true;

    if (!tabletUser || !pinMatches || !emailMatches) {
      await this.redis.registerFailedAttempt(dto.deviceId);
      throw new AppException('INVALID_PIN', 'PIN ou identifiants incorrects', 401);
    }

    await this.redis.clearFailedAttempts(dto.deviceId);

    const payload = {
      sub: tabletUser.userId,
      role: tabletUser.role,
      deviceId: tabletUser.deviceId,
      enseigneId: tabletUser.enseigneId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: TABLET_SESSION_TTL_SECONDS,
    });

    return {
      accessToken,
      expiresIn: TABLET_SESSION_TTL_SECONDS,
      role: tabletUser.role,
      statsAccess: tabletUser.role === Role.kds_chef,
    };
  }

  async seedTabletUser(user: {
    pin: string;
    email?: string;
    role: Role;
    deviceId: string;
    enseigneId: string;
    fullName: string;
  }) {
    const pinHash = await bcrypt.hash(user.pin, 10);
    this.usersStore.createTabletUser({
      userId: uuid(),
      email: user.email,
      pinHash,
      role: user.role,
      deviceId: user.deviceId,
      enseigneId: user.enseigneId,
      fullName: user.fullName,
    });
  }

  
}