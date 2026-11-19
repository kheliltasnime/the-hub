import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateMemberDto {
  @ApiProperty({
    example: 'Réclamation traitée — compte débloqué suite vérification SAV',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}