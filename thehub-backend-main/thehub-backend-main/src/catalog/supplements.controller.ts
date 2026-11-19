import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SupplementsService } from './supplements.service';
import { CreateSupplementGroupDto } from './dto/create-supplement-group.dto';
import { UpdateSupplementGroupDto } from './dto/update-supplement-group.dto';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { UpdateSupplementDto } from './dto/update-supplement.dto';
import { AttachSupplementGroupsDto } from './dto/attach-supplement-groups.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

const CATALOG_ROLES = [Role.super_admin, Role.manager_fnb] as const;

@ApiTags('Catalogue — Suppléments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_ROLES)
@Controller('menus/supplement-groups')
export class SupplementsController {
  constructor(private readonly supplementsService: SupplementsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des groupes de suppléments' })
  listGroups() {
    return this.supplementsService.listGroups();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un groupe de suppléments" })
  getGroup(@Param('id') id: string) {
    return this.supplementsService.getGroupById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un groupe de suppléments (ex: "Sauces")' })
  createGroup(@Body() dto: CreateSupplementGroupDto) {
    return this.supplementsService.createGroup(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier un groupe (nom, règles min/max)" })
  updateGroup(@Param('id') id: string, @Body() dto: UpdateSupplementGroupDto) {
    return this.supplementsService.updateGroup(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un groupe (refusé si encore utilisé par des articles)' })
  deleteGroup(@Param('id') id: string) {
    return this.supplementsService.deleteGroup(id);
  }

  @Post(':groupId/supplements')
  @ApiOperation({ summary: 'Ajouter un supplément à un groupe (ex: "Sauce harissa" dans "Sauces")' })
  createSupplement(@Param('groupId') groupId: string, @Body() dto: CreateSupplementDto) {
    return this.supplementsService.createSupplement(groupId, dto);
  }

  @Patch('supplements/:id')
  @ApiOperation({ summary: "Modifier un supplément" })
  updateSupplement(@Param('id') id: string, @Body() dto: UpdateSupplementDto) {
    return this.supplementsService.updateSupplement(id, dto);
  }

  @Patch('supplements/:id/toggle')
  @ApiOperation({ summary: 'Activer/désactiver un supplément' })
  toggleSupplement(@Param('id') id: string) {
    return this.supplementsService.toggleSupplement(id);
  }

  @Patch('menu-items/:menuItemId/attach')
  @ApiOperation({ summary: 'Associer des groupes de suppléments à un article (remplace la liste existante)' })
  attachToItem(@Param('menuItemId') menuItemId: string, @Body() dto: AttachSupplementGroupsDto) {
    return this.supplementsService.attachGroupsToItem(menuItemId, dto);
  }
}