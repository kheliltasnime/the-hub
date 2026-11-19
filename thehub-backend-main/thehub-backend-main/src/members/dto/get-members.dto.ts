import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileType } from '@prisma/client';

// Pas de filtre `role` ici volontairement : ce endpoint ne liste que les membres
// app (role: 'user' forcé côté service). Lister par rôle staff relève d'AdminModule.
export class GetMembersDto {
  @ApiPropertyOptional({ example: 'asma', description: "Recherche sur le nom ou l'email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProfileType })
  @IsOptional()
  @IsEnum(ProfileType)
  profileType?: ProfileType;

  @ApiPropertyOptional({ description: 'Inclure aussi les comptes suspendus', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({ example: '2025-01-01', description: "Date d'inscription minimale (incluse), §7.1" })
  @IsOptional()
  @IsDateString()
  registeredFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: "Date d'inscription maximale (incluse), §7.1" })
  @IsOptional()
  @IsDateString()
  registeredTo?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}