import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminTabletAuthService } from './admin-tablet-auth.service';
import { TabletLoginDto } from './dto/tablet-login.dto';

@ApiTags('Tablette — Auth (KDS/POS)')
@Controller('tablet')
export class AdminTabletAuthController {
  constructor(private readonly service: AdminTabletAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // §8.1 : 10 tentatives PIN / minute / IP
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion tablette KDS/POS par PIN (+ email pour kds_chef)' })
  login(@Body() dto: TabletLoginDto) {
    return this.service.tabletLogin(dto);
  }
}