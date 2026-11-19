import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersStore } from './users.store';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserModule } from '../user/user.module';
import { JwtConfigModule } from '../common/jwt/jwt-config.module';
@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersStore,
    
    JwtAuthGuard,
    GoogleAuthGuard,
    GoogleStrategy,
  ],
  exports: [UsersStore, JwtConfigModule,JwtAuthGuard],
})
export class AuthModule {}
