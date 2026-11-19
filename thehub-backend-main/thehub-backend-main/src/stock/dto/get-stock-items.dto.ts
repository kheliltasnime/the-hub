import { IsOptional, IsUUID, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockStatus } from '../stock-status.util';

export class GetStockItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enseigneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categorieId?: string;

  @ApiPropertyOptional({ description: "Recherche sur le nom de l'article" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}