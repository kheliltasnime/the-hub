import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Un membre créé ici est toujours un compte app standard (role: 'user').
// L'attribution d'un rôle staff (super_admin, sav, manager_*...) relève
// exclusivement de AdminModule — pas de champ `role` ici, volontairement.
export class CreateMemberDto {
  @ApiProperty({ example: 'nouveau.membre@thehubghazela.tn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nouveau Membre' })
  @IsString()
  fullName!: string;

  @ApiProperty({ enum: ['etudiant', 'professionnel'], example: 'professionnel' })
  @IsIn(['etudiant', 'professionnel'])
  profileType!: 'etudiant' | 'professionnel';

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