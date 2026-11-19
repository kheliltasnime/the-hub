import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Pas de champ `role` ici volontairement : voir update-admin-role.dto.ts,
// action séparée et plus restreinte (super_admin uniquement).
export class UpdateAdminAccountDto {
  @ApiPropertyOptional({ example: 'Nom Modifié' })
  @IsOptional()
  @IsString()
  fullName?: string;
}