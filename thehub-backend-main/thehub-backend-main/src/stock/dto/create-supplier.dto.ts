import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Grossiste Tunis Frais' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom!: string;

  @ApiPropertyOptional({ example: 'produits frais' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ example: '+216 20 123 456' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact?: string;
}