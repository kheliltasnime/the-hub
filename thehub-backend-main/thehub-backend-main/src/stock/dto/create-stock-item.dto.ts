import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockItemDto {
  @ApiProperty({ example: 'uuid-menu-item' })
  @IsUUID()
  menuItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ example: 100, description: 'Stock cible idéal' })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetStock?: number;

  @ApiPropertyOptional({ example: 100, description: 'Stock initial (défaut 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}