import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'uuid-enseigne' })
  @IsUUID()
  enseigneId!: string;

  @ApiProperty({ example: 'Petits-déjeuners' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom!: string;
}