import { Body, Controller, Get, Param, Patch, Post, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { DeactivateAdminAccountDto } from './dto/deactivate-admin-account.dto';
import { GetAdminAccountsDto } from './dto/get-admin-accounts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@ApiTags('Admin — Comptes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin) // Toutes les routes de ce contrôleur : super_admin uniquement
@Controller('admin/accounts')
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des comptes admin/staff' })
  listAccounts(@Query() query: GetAdminAccountsDto) {
    return this.adminAccountsService.listAccounts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un compte admin" })
  getAccount(@Param('id') id: string) {
    return this.adminAccountsService.getAccountById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un compte admin/staff (manager, SAV...)' })
  createAccount(@Req() req: any, @Body() dto: CreateAdminAccountDto) {
    return this.adminAccountsService.createAccount(req.user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier les informations d'un compte admin" })
  updateAccount(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAdminAccountDto) {
    return this.adminAccountsService.updateAccount(req.user.sub, id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Modifier le rôle d'un compte admin" })
  updateAccountRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAdminRoleDto) {
    return this.adminAccountsService.updateAccountRole(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un compte admin (motif obligatoire)' })
  deactivateAccount(@Req() req: any, @Param('id') id: string, @Body() dto: DeactivateAdminAccountDto) {
    return this.adminAccountsService.deactivateAccount(req.user.sub, id, dto);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Réactiver un compte admin' })
  reactivateAccount(@Req() req: any, @Param('id') id: string) {
    return this.adminAccountsService.reactivateAccount(req.user.sub, id);
  }
}