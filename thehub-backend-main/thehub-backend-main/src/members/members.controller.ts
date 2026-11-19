import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SuspendMemberDto } from './dto/suspend-member.dto';
import { ActivateMemberDto } from './dto/activate-member.dto';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { AddLoyaltyPointsDto } from './dto/add-loyalty-points.dto';
import { GetMembersDto } from './dto/get-members.dto';
import { GetMemberHistoryDto } from './dto/get-member-history.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

const MEMBER_READ_ROLES = [Role.super_admin, Role.manager_coworking, Role.sav] as const;
const MEMBER_WRITE_ROLES = [Role.super_admin, Role.manager_coworking] as const;

@ApiTags('Membres (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Annuaire des membres (recherche, filtres, pagination)' })
  listMembers(@Query() query: GetMembersDto) {
    return this.membersService.listMembers(query);
  }

  // IMPORTANT : déclaré AVANT ':id' pour que 'export' ne soit pas capturé comme un id.
  @Get('export')
  @Roles(...MEMBER_READ_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: "Export CSV de l'annuaire filtré (§7.1)" })
  async exportMembers(@Query() query: GetMembersDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.membersService.exportMembersCsv(query);
    res.set('Content-Disposition', `attachment; filename="membres-${Date.now()}.csv"`);
    return csv;
  }

  @Get(':id')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Fiche membre' })
  getMember(@Param('id') id: string) {
    return this.membersService.getMemberById(id);
  }

  @Get(':id/wallet')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Solde et historique complet du wallet (§7.2)' })
  getMemberWallet(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberWallet(req.user.sub, id);
  }

  @Get(':id/orders')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Historique des commandes F&B du membre (§7.2)' })
  getMemberOrders(@Param('id') id: string, @Query() query: GetMemberHistoryDto) {
    return this.membersService.getMemberOrders(id, query);
  }

  @Get(':id/reservations')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Historique des réservations coworking du membre (§7.2)' })
  getMemberReservations(@Param('id') id: string, @Query() query: GetMemberHistoryDto) {
    return this.membersService.getMemberReservations(id, query);
  }

  @Get(':id/export/pdf')
  @Roles(...MEMBER_READ_ROLES)
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Export PDF de la fiche membre (§7.3)' })
  async exportMemberPdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const pdf = await this.membersService.generateMemberPdf(req.user.sub, id);
    res.set('Content-Disposition', `attachment; filename="fiche-membre-${id}.pdf"`);
    res.send(pdf);
  }

  @Post()
  @Roles(...MEMBER_WRITE_ROLES)
  @ApiOperation({ summary: 'Créer un compte membre' })
  createMember(@Body() dto: CreateMemberDto) {
    return this.membersService.createMember(dto);
  }

  @Patch(':id')
  @Roles(...MEMBER_WRITE_ROLES)
  @ApiOperation({ summary: "Modifier les informations d'un membre" })
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.updateMember(id, dto);
  }

  @Patch(':id/suspend')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Suspendre un membre (motif obligatoire)' })
  suspendMember(@Req() req: any, @Param('id') id: string, @Body() dto: SuspendMemberDto) {
    return this.membersService.suspendMember(req.user.sub, id, dto);
  }

  @Patch(':id/activate')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Réactiver un membre suspendu (motif obligatoire)' })
  activateMember(@Req() req: any, @Param('id') id: string, @Body() dto: ActivateMemberDto) {
    return this.membersService.activateMember(req.user.sub, id, dto);
  }

  @Post(':id/wallet/credit')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Créditer manuellement le wallet (geste commercial, motif obligatoire)' })
  creditWallet(@Req() req: any, @Param('id') id: string, @Body() dto: CreditWalletDto) {
    return this.membersService.creditWallet(req.user.sub, id, dto);
  }

  @Post(':id/wallet/debit')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Débiter manuellement le wallet (correction, motif obligatoire)' })
  debitWallet(@Req() req: any, @Param('id') id: string, @Body() dto: DebitWalletDto) {
    return this.membersService.debitWallet(req.user.sub, id, dto);
  }

  @Post(':id/loyalty/points')
  @Roles(...MEMBER_READ_ROLES)
  @ApiOperation({ summary: 'Ajouter des points de fidélité manuellement (motif obligatoire)' })
  addLoyaltyPoints(@Req() req: any, @Param('id') id: string, @Body() dto: AddLoyaltyPointsDto) {
    return this.membersService.addLoyaltyPoints(req.user.sub, id, dto);
  }
}