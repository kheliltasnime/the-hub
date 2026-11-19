import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateThresholdsDto {
  @ApiProperty({ example: 30, description: 'Au-dessus de ce % du stock cible → statut Vert' })
  @IsInt()
  @Min(0)
  @Max(100)
  greenThresholdPct!: number;

  @ApiProperty({ example: 15, description: 'En dessous de ce % → statut Rouge (entre les deux → Orange)' })
  @IsInt()
  @Min(0)
  @Max(100)
  orangeThresholdPct!: number;
}