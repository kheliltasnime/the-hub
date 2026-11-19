import { IsNumber, IsPositive, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DebitWalletDto {
  @ApiProperty({ example: 10.0, description: 'Montant à débiter (en DT), doit être positif' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'Correction — crédit erroné le 18/07',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}