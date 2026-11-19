import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService, REFRESH_TOKEN_COOKIE_NAME } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Admin — Auth')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion admin — refresh token renvoyé en cookie httpOnly' })
  adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.adminAuthService.adminLogin(dto, res);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouvelle l\'access token via le refresh token (cookie httpOnly)' })
  adminRefresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.adminAuthService.adminRefresh(req.cookies?.[REFRESH_TOKEN_COOKIE_NAME], res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Déconnexion admin — invalide le cookie et la session' })
  adminLogout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.adminAuthService.adminLogout(req.user.sub, res);
  }
}