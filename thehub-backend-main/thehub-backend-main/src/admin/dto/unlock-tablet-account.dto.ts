import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnlockTabletAccountDto {
  @ApiProperty({
    example: 'Déblocage suite appel de l\'équipier — identité vérifiée',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}