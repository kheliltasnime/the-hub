import { IsOptional, IsString, IsIn, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ADMIN_ASSIGNABLE_ROLES } from './create-admin-account.dto';

export class GetAdminAccountsDto {
  @ApiPropertyOptional({ example: 'tasnime', description: "Recherche sur le nom ou l'email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ADMIN_ASSIGNABLE_ROLES, description: 'Filtrer par rôle backoffice' })
  @IsOptional()
  @IsIn(ADMIN_ASSIGNABLE_ROLES)
  role?: Role;

  @ApiPropertyOptional({ description: 'Inclure aussi les comptes désactivés', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;

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