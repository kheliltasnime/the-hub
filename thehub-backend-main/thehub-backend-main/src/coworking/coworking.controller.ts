import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CoworkingService } from './coworking.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetSpacesDto } from './dto/get-spaces.dto';
import { GetEnseignesDto } from './dto/get-enseignes.dto';
import { CreateSpaceBlockDto } from './dto/create-space-block.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CoworkingRoleGuard, CoworkingRoles } from './guards/coworking-role.guard';

@ApiTags('Coworking')
@Controller('coworking')
export class CoworkingController {
  constructor(private readonly coworkingService: CoworkingService) {}

  @Get('enseignes')
  @ApiOperation({ summary: 'Liste/recherche des enseignes proposant des espaces coworking' })
  listEnseignes(@Query() query: GetEnseignesDto) {
    return this.coworkingService.listEnseignes(query);
  }

  @Get('spaces')
  @ApiOperation({
    summary:
      'Liste des espaces coworking (filtrable par type/capacité/enseigne/recherche), avec statut calculé (disponible/presque_plein/complet/ferme)',
  })
  listSpaces(@Query() query: GetSpacesDto) {
    return this.coworkingService.listSpaces(query);
  }

  @Get('spaces/:id')
  @ApiOperation({ summary: "Détail d'un espace, avec statut calculé en temps réel" })
  getSpace(@Param('id') id: string) {
    return this.coworkingService.getSpace(id);
  }

  @Get('spaces/:id/availability')
  @ApiOperation({ summary: "Disponibilité d'un espace (créneaux horaires ou options de durée selon le type)" })
  getAvailability(@Param('id') id: string, @Query() query: GetAvailabilityDto) {
    return this.coworkingService.getAvailability(id, query);
  }

  @Get('spaces/:id/activities')
  @ApiOperation({ summary: "Tarifs par activité pour un espace facturé à l'activité (ex: Game Zone)" })
  listActivities(@Param('id') id: string) {
    return this.coworkingService.listActivities(id);
  }

  // ---------- Blocages (maintenance, travaux, réparation, événement interne, fermeture externe) ----------

  @Post('spaces/:id/block')
  @UseGuards(JwtAuthGuard, CoworkingRoleGuard)
  @CoworkingRoles(Role.manager_coworking, Role.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Bloquer un espace sur une période (maintenance, travaux, réparation, événement interne, fermeture externe)" })
  createBlock(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSpaceBlockDto) {
    return this.coworkingService.createBlock(req.user.sub, id, dto);
  }

  @Get('spaces/:id/blocks')
  @UseGuards(JwtAuthGuard, CoworkingRoleGuard)
  @CoworkingRoles(Role.manager_coworking, Role.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Historique et blocages à venir d'un espace" })
  listBlocks(@Param('id') id: string) {
    return this.coworkingService.listBlocks(id);
  }

  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard, CoworkingRoleGuard)
  @CoworkingRoles(Role.manager_coworking, Role.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lever un blocage avant son terme (ex: fin anticipée des travaux)" })
  deleteBlock(@Param('blockId') blockId: string) {
    return this.coworkingService.deleteBlock(blockId);
  }

  // ---------- Réservations ----------

  @Post('reservations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une réservation (heure, demi-journée, journée, multi-jours ou activité selon l'espace)" })
  createReservation(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.coworkingService.createReservation(req.user.sub, dto);
  }

  @Get('reservations/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes réservations (passées et à venir)' })
  listMyReservations(@Req() req: any) {
    return this.coworkingService.listMyReservations(req.user.sub);
  }

  @Patch('reservations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reprogrammer une réservation (>48h avant le créneau initial uniquement)' })
  updateReservation(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.coworkingService.updateReservation(req.user.sub, id, dto);
  }

  @Post('reservations/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler une réservation (remboursement 100% si >48h, 50% sinon)' })
  cancelReservation(@Req() req: any, @Param('id') id: string, @Body() dto: CancelReservationDto) {
    return this.coworkingService.cancelReservation(req.user.sub, id, dto);
  }

  @Post('reservations/:id/checkin')
  @UseGuards(JwtAuthGuard, CoworkingRoleGuard)
  @CoworkingRoles(Role.manager_coworking, Role.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check-in manuel sur place (réservé manager coworking / admin)' })
  checkIn(@Param('id') id: string) {
    return this.coworkingService.checkIn(id);
  }
}