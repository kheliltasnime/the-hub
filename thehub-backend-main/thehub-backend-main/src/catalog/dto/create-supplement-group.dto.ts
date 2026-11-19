import { IsString, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplementGroupDto {
  @ApiProperty({ example: 'Sauces' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom!: string;

  @ApiProperty({ example: 0, description: 'Nombre minimum de suppléments à sélectionner' })
  @IsInt()
  @Min(0)
  minSelect!: number;

  @ApiProperty({ example: 3, description: 'Nombre maximum de suppléments à sélectionner' })
  @IsInt()
  @Min(1)
  maxSelect!: number;
}