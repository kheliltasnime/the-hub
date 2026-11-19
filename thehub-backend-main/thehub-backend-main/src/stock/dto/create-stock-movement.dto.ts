import { IsIn, IsInt, IsOptional, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

// Seuls ces 2 types se créent manuellement — SORTIE_CONSOMMATION est exclusivement
// généré par le système (StockOrderConsumptionListener), jamais depuis le Backoffice.
export const MANUAL_MOVEMENT_TYPES = [StockMovementType.ENTREE_FOURNISSEUR, StockMovementType.AJUSTEMENT_MANUEL] as const;

export class CreateStockMovementDto {
  @ApiProperty({ enum: MANUAL_MOVEMENT_TYPES, example: StockMovementType.ENTREE_FOURNISSEUR })
  @IsIn(MANUAL_MOVEMENT_TYPES)
  type!: (typeof MANUAL_MOVEMENT_TYPES)[number];

  @ApiProperty({
    example: 50,
    description: 'Positive pour ENTREE_FOURNISSEUR. Positive ou négative pour AJUSTEMENT_MANUEL (correction).',
  })
  @IsInt()
  quantite!: number;

  @ApiPropertyOptional({ description: 'Pertinent surtout pour une entrée fournisseur' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({
    example: 'Livraison hebdomadaire — bon de livraison #4521',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}