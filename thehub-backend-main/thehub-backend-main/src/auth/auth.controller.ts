import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleOAuthDto } from './dto/google-oauth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('auth/refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

 @Post('auth/logout')
@UseGuards(JwtAuthGuard)
@HttpCode(200)
logout(@Req() req: any) {
  return this.authService.logout(req.user.sub);
}

  @Post('auth/pin-login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
  }

  @Get('auth/oauth/google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('auth/oauth/google/callback')
  @UseGuards(GoogleAuthGuard)
 async googleCallback(@Req() req: any, @Res() res: Response) {
  const result = await this.authService.oauthLogin(req.user, 'google');

  const params = new URLSearchParams({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: String(result.expiresIn),
  });

  return res.redirect(`thehubghazela://oauth-callback?${params.toString()}`);
}

  @Post('auth/oauth/google')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@HttpCode(200)
googleOAuthMobile(@Body() dto: GoogleOAuthDto) {
  return this.authService.oauthLoginWithIdToken(dto.idToken, 'google');
}
}
