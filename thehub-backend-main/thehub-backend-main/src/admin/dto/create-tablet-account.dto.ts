import { IsString, IsIn, IsEmail, Matches, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

// Seuls ces 3 rôles sont de VRAIS comptes PIN tablette (CDC technique, Table 11).
// kds_manager et pos_manager utilisent email+mot de passe → voir create-admin-account.dto.ts
export const TABLET_ASSIGNABLE_ROLES = [Role.kds_chef, Role.kds_equipier, Role.pos_caissier] as const;

export class CreateTabletAccountDto {
  @ApiProperty({ example: 'Yassine Équipier' })
  @IsString()
  fullName!: string;

  @ApiProperty({
    enum: TABLET_ASSIGNABLE_ROLES,
    example: Role.kds_equipier,
    description: 'kds_equipier/pos_caissier = PIN seul | kds_chef = email + PIN',
  })
  @IsIn(TABLET_ASSIGNABLE_ROLES)
  role!: Role;

  @ApiProperty({ example: 'tablette-kds-03', description: 'Identifiant unique de la tablette assignée' })
  @IsString()
  deviceId!: string;

  @ApiProperty({
    example: '1234',
    description: '4 chiffres pour les rôles KDS, 6 chiffres pour pos_caissier',
  })
  @Matches(/^\d{4,6}$/, { message: 'Le PIN doit contenir uniquement des chiffres (4 pour KDS, 6 pour POS)' })
  pin!: string;

  @ApiPropertyOptional({
    example: 'chef.brew@thehubghazela.tn',
    description: 'Requis uniquement pour le rôle kds_chef',
  })
  @ValidateIf((o) => o.role === Role.kds_chef)
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Enseigne à laquelle ce compte est rattaché (requis pour les rôles KDS)',
    example: 'uuid-de-lenseigne',
  })
  @ValidateIf((o) => o.role === Role.kds_chef || o.role === Role.kds_equipier)
  @IsUUID()
  enseigneId?: string;
}