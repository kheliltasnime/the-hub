import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderCategoriesDto {
  @ApiProperty({
    example: ['uuid-cat-2', 'uuid-cat-1', 'uuid-cat-3'],
    description: "Liste des IDs de catégories dans le nouvel ordre souhaité (toutes de la même enseigne)",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}