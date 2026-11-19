import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiPropertyOptional({ example: 'Nom Modifié' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: ['etudiant', 'professionnel'] })
  @IsOptional()
  @IsIn(['etudiant', 'professionnel'])
  profileType?: 'etudiant' | 'professionnel';
}