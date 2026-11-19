import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto';
import { GetMenuItemsDto } from './dto/get-menu-items.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { StorageService } from '../common/storage/storage.service';

const CATALOG_ROLES = [Role.super_admin, Role.manager_fnb] as const;

@ApiTags('Catalogue — Articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_ROLES)
@Controller('menus/items')
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des articles (filtres, pagination)' })
  list(@Query() query: GetMenuItemsDto) {
    return this.menuItemsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un article" })
  getById(@Param('id') id: string) {
    return this.menuItemsService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un article' })
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuItemsService.create(dto);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload de la photo d'un article — retourne l'URL à passer dans photoUrl (max 5 Mo, §6.3)" })
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }
    this.menuItemsService.validatePhotoSize(file.size);
    const url = await this.storageService.uploadImage(file, 'menu-items');
    return { photoUrl: url };
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Réordonner les articles (drag & drop) — §6.2' })
  reorder(@Query('categorieId') categorieId: string, @Body() dto: ReorderMenuItemsDto) {
    return this.menuItemsService.reorder(categorieId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier un article — publication immédiate dans l'app" })
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/désactiver un article (rupture temporaire) — §6.2' })
  toggle(@Param('id') id: string) {
    return this.menuItemsService.toggleAvailability(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un article (soft delete, refusé si présent dans une commande active)' })
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }
}