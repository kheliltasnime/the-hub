import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminTabletAccountsService } from './admin-tablet-accounts.service';
import { CreateTabletAccountDto } from './dto/create-tablet-account.dto';
import { UpdateTabletPinDto } from './dto/update-tablet-pin.dto';
import { UnlockTabletAccountDto } from './dto/unlock-tablet-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@ApiTags('Admin — Comptes tablette (KDS/POS)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin, Role.manager_fnb)
@Controller('admin/tablet-accounts')
export class AdminTabletAccountsController {
  constructor(private readonly service: AdminTabletAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des comptes tablette (équipiers, chefs, caissiers)' })
  listTabletAccounts() {
    return this.service.listTabletAccounts();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un compte tablette PIN (kds_equipier, kds_chef, pos_caissier)' })
  createTabletAccount(@Req() req: any, @Body() dto: CreateTabletAccountDto) {
    return this.service.createTabletAccount(req.user.sub, dto);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: "Modifier le PIN d'un compte tablette" })
  updateTabletPin(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTabletPinDto) {
    return this.service.updateTabletPin(req.user.sub, id, dto);
  }

  @Patch(':id/unlock')
  @ApiOperation({ summary: 'Débloquer un compte tablette verrouillé (motif obligatoire, §8.1)' })
  unlockTabletAccount(@Req() req: any, @Param('id') id: string, @Body() dto: UnlockTabletAccountDto) {
    return this.service.unlockTabletAccount(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un compte tablette (perte/vol/départ)' })
  deactivateTabletAccount(@Req() req: any, @Param('id') id: string) {
    return this.service.deactivateTabletAccount(req.user.sub, id);
  }
}