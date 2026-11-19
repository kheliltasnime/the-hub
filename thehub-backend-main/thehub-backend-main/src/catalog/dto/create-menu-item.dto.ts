import { IsString, IsUUID, IsNumber, IsPositive, IsOptional, IsArray, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allergene } from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateMenuItemDto {
  @ApiProperty({ example: 'uuid-enseigne' })
  @IsUUID()
  enseigneId!: string;

  @ApiProperty({ example: 'uuid-categorie' })
  @IsUUID()
  categorieId!: string;

  @ApiProperty({ example: 'Croissant beurre' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom!: string;

  @ApiPropertyOptional({ example: 'Croissant pur beurre, cuisson maison' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 4.5, description: 'Prix en DT, doit être strictement positif' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Le prix doit être strictement positif (prix nul ou négatif refusé)' })
  prix!: number;

  @ApiPropertyOptional({ description: "URL de la photo (voir POST /menu-items/upload-photo pour l'obtenir)" })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ enum: Allergene, isArray: true, example: [Allergene.gluten, Allergene.lactose] })
  @IsOptional()
  @IsArray()
  @IsEnum(Allergene, { each: true })
  allergenes?: Allergene[];

  @ApiPropertyOptional({ example: '07:00', description: "Début de disponibilité (HH:mm), omettre = disponible toute la journée" })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Format attendu HH:mm' })
  availabilityStart?: string;

  @ApiPropertyOptional({ example: '11:00', description: 'Fin de disponibilité (HH:mm)' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Format attendu HH:mm' })
  availabilityEnd?: string;
}