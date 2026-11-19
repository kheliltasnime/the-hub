import { IsOptional, IsEnum, IsInt, Min, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceType } from '@prisma/client';

export class GetSpacesDto {
  @ApiPropertyOptional({ enum: SpaceType, description: "Filtrer par type d'espace" })
  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @ApiPropertyOptional({ example: 4, description: 'Capacité minimale requise' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ description: "Filtrer les espaces d'une enseigne précise" })
  @IsOptional()
  @IsUUID()
  enseigneId?: string;

  @ApiPropertyOptional({ example: 'Atlas', description: "Recherche texte sur le nom de l'espace" })
  @IsOptional()
  @IsString()
  search?: string;
}