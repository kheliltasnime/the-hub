import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { SupplementsController } from './supplements.controller';
import { SupplementsService } from './supplements.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [CategoriesController, MenuItemsController, SupplementsController],
  providers: [CategoriesService, MenuItemsService, SupplementsService],
  exports: [MenuItemsService],
})
export class CatalogModule {}