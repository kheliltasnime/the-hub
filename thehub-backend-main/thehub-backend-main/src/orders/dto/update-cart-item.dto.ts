import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(0) // 0 = retire l'article du panier
  quantite!: number;
}