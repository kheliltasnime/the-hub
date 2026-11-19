import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.userService.me(req.user.sub);
  }

  @Patch('me/push-token')
@UseGuards(JwtAuthGuard)
async setPushToken(@Req() req: any, @Body() dto: { fcmToken: string }) {
  await this.userService.setPushToken(req.user.sub, dto.fcmToken);
  return { message: 'Token enregistré' };
}
}
