import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Petits-déjeuners & Brunch' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom!: string;
}