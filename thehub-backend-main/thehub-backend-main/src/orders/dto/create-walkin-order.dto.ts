import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class WalkInItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantite!: number;
}

export class CreateWalkInOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WalkInItemDto)
  items!: WalkInItemDto[];

 @IsOptional()
@IsIn(['ESPECES', 'CARTE', 'VIREMENT', 'WALLET'])
modePaiement?: string;

  @IsOptional()
  @IsString()
  walletReferenceId?: string; // requis uniquement si modePaiement === 'WALLET'
}