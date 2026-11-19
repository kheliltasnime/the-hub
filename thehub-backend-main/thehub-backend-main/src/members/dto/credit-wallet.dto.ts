import { IsNumber, IsPositive, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreditWalletDto {
  @ApiProperty({ example: 15.0, description: 'Montant à créditer (en DT), doit être positif' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'Geste commercial — commande annulée par erreur cuisine',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}