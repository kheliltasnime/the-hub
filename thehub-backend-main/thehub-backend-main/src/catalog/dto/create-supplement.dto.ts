import { IsString, IsNumber, Min, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplementDto {
  @ApiProperty({ example: 'Sauce harissa' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom!: string;

  @ApiProperty({ example: 0.5, description: 'Prix additionnel en DT (0 = gratuit)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  prix!: number;

  @ApiProperty({ example: 2, description: "Quantité max de CET ingrédient par commande — §6.2 'max 2 par ingrédient'" })
  @IsInt()
  @Min(1)
  maxQuantite!: number;
}