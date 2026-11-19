import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderMenuItemsDto {
  @ApiProperty({
    example: ['uuid-item-3', 'uuid-item-1', 'uuid-item-2'],
    description: "IDs des articles dans le nouvel ordre (tous de la même catégorie) — §6.2 drag & drop",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  itemIds!: string[];
}