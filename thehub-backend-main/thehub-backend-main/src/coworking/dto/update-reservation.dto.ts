import { IsDateString, Matches, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DurationType, HalfDayPeriod } from '@prisma/client';

export class UpdateReservationDto {
  @ApiPropertyOptional({
    example: '2026-07-26',
    description: 'Nouvelle date de début — à fournir avec le reste du créneau pour reprogrammer',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  // --- Horaire précis choisi par l'utilisateur ---
  // Obligatoire pour les espaces facturés à l'heure ou à l'activité.
  // Optionnel pour les espaces facturés à la journée : permet de choisir un horaire précis
  // à l'intérieur de la demi-journée/journée reprogrammée (doit rester dans les bornes de la période).
  @ApiPropertyOptional({
    example: '14:00',
    description:
      "Requis pour les espaces facturés à l'heure ou à l'activité. Optionnel pour les espaces facturés à la " +
      "journée (permet de choisir un horaire précis dans la demi-journée/journée).",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'startTime doit être au format HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({
    example: '16:00',
    description:
      "Requis pour les espaces facturés à l'heure ou à l'activité. Optionnel pour les espaces facturés à la journée.",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'endTime doit être au format HH:mm' })
  endTime?: string;

  @ApiPropertyOptional({ enum: DurationType, description: 'Pour les espaces facturés à la journée' })
  @IsOptional()
  @IsEnum(DurationType)
  durationType?: DurationType;

  @ApiPropertyOptional({ enum: HalfDayPeriod })
  @IsOptional()
  @IsEnum(HalfDayPeriod)
  halfDayPeriod?: HalfDayPeriod;

  @ApiPropertyOptional({ example: 3, description: 'Requis si durationType = multi_day' })
  @IsOptional()
  @IsInt()
  @Min(2)
  numberOfDays?: number;

  // --- Pour reprogrammer vers/dans un espace facturé à l'activité ---
  @ApiPropertyOptional({
    description:
      "Requis si l'espace a pricingUnit = activity et que l'activité change. Ne doit PAS être fourni pour un autre type d'espace.",
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;
}