import { IsInt, IsPositive, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddLoyaltyPointsDto {
  @ApiProperty({ example: 50, description: 'Nombre de points à ajouter, doit être positif' })
  @IsInt()
  @IsPositive()
  points!: number;

  @ApiProperty({
    example: 'Compensation — bug applicatif ayant empêché le calcul automatique',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}