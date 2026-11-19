import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

// Rôles créables via ce module : tous les comptes qui se connectent par email+mot de passe.
// - 'user' est exclu : c'est un membre, pas un admin (relève de MemberModule).
// - kds_equipier/kds_chef/pos_caissier sont exclus : ce sont de VRAIS comptes PIN
//   tablette (cf. CDC technique Table 11), gérés par create-tablet-account.dto.ts.
// - kds_manager et pos_manager sont INCLUS ici : d'après le CDC (Table 11), ces
//   rôles "Manager" se connectent par email + mot de passe comme un admin classique,
//   pas par PIN — malgré le préfixe kds_/pos_ dans leur nom.
export const ADMIN_ASSIGNABLE_ROLES = [
  Role.super_admin,
  Role.manager_fnb,
  Role.manager_coworking,
  Role.sav,
  Role.kds_manager,
  Role.pos_manager,
] as const;

export class CreateAdminAccountDto {
  @ApiProperty({ example: 'nouveau.manager@thehubghazela.tn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nouveau Manager' })
  @IsString()
  fullName!: string;

  @ApiProperty({
    enum: ADMIN_ASSIGNABLE_ROLES,
    example: Role.manager_coworking,
    description: 'Rôle backoffice à attribuer (jamais "user" ni les rôles tablette kds_*/pos_*)',
  })
  @IsIn(ADMIN_ASSIGNABLE_ROLES)
  role!: Role;

  @ApiPropertyOptional({
    example: 'MotDePasse123!',
    description: 'Si omis, un mot de passe temporaire est généré automatiquement',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}