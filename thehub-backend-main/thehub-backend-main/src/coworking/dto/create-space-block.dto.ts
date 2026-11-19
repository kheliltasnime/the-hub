import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpaceBlockReason } from '@prisma/client';

export class CreateSpaceBlockDto {
  @ApiProperty({ enum: SpaceBlockReason, example: SpaceBlockReason.maintenance })
  @IsEnum(SpaceBlockReason)
  reasonType!: SpaceBlockReason;

  @ApiPropertyOptional({ example: 'Réparation climatisation salle Atlas' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonNote?: string;

  @ApiProperty({ example: '2026-08-01', description: 'Date de début du blocage (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-08-03', description: 'Date de fin du blocage (YYYY-MM-DD), incluse' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    example: '00:00',
    description: "Heure de début du blocage chaque jour de la période (défaut : toute la journée)",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'startTime doit être au format HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({ example: '23:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'endTime doit être au format HH:mm' })
  endTime?: string;
}