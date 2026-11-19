import { IsOptional, IsUUID, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetMenuItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enseigneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categorieId?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Inclure aussi les articles désactivés (rupture)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeUnavailable?: boolean;

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