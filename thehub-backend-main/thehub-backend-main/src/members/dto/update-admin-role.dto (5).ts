import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

// Anciennement dans members/dto/update-member-role.dto.ts — déplacé ici :
// attribuer un rôle est une action de sécurité (AdminModule), pas une
// action sur les données d'un membre (MemberModule).
export class UpdateAdminRoleDto {
  @ApiProperty({ enum: Role, example: Role.manager_coworking })
  @IsEnum(Role)
  role!: Role;
}