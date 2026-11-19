import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PayOrderDto {
  @IsIn(['ESPECES', 'CARTE', 'VIREMENT', 'WALLET'])
  modePaiement!: 'ESPECES' | 'CARTE' | 'VIREMENT' | 'WALLET';

  @IsOptional()
  @IsString()
  walletReferenceId?: string; // requis si WALLET

  @IsOptional()
  @IsNumber()
  @Min(0)
  montantRecu?: number; // requis si ESPECES (CDC §3.3 : calcul monnaie à rendre)

  @IsOptional()
  @IsString()
  referenceVirement?: string; // requis si VIREMENT (CDC §3.4 : saisie référence manuelle)
}