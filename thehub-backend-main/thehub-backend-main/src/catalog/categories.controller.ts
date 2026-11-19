import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

// RBAC conforme §4.1 CDC fonctionnel : module (menus) → Super Admin, Manager F&B
const CATALOG_ROLES = [Role.super_admin, Role.manager_fnb] as const;

@ApiTags('Catalogue — Catégories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_ROLES)
@Controller('menus/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Liste des catégories d'une enseigne, triées par ordre d'affichage" })
  list(@Query('enseigneId') enseigneId: string) {
    return this.categoriesService.listByEnseigne(enseigneId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer une catégorie' })
  rename(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.rename(id, dto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Réordonner les catégories (drag & drop) — §6.2' })
  reorder(@Query('enseigneId') enseigneId: string, @Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(enseigneId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une catégorie (refusé si articles encore rattachés)' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}