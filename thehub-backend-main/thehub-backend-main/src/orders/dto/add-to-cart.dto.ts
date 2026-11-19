import { IsInt, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantite!: number;
}