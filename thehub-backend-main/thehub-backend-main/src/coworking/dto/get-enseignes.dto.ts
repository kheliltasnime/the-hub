import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEnseignesDto {
  @ApiPropertyOptional({ example: 'Brew', description: "Recherche texte sur le nom de l'enseigne" })
  @IsOptional()
  @IsString()
  search?: string;
}