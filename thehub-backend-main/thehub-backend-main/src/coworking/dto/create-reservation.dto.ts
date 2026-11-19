import { IsUUID, IsDateString, Matches, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMode, DurationType, HalfDayPeriod } from '@prisma/client';

export class CreateReservationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  spaceId!: string;

  @ApiProperty({ example: '2026-07-25', description: 'Date de début, format ISO (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  // --- Horaire précis choisi par l'utilisateur ---
  // Obligatoire pour les espaces facturés à l'heure ou à l'activité.
  // Optionnel pour les espaces facturés à la journée (half_day / full_day / multi_day) :
  // s'ils sont fournis, ils doivent rester dans les bornes de la période choisie
  // (demi-journée ou horaires d'ouverture de l'espace) sinon l'API renvoie TIME_OUT_OF_BOUNDS.
  // S'ils sont omis pour un espace facturé à la journée, la plage complète de la période est utilisée.
  @ApiPropertyOptional({
    example: '10:00',
    description:
      "Requis pour les espaces facturés à l'heure ou à l'activité. Optionnel pour les espaces facturés à la " +
      "journée (permet à l'utilisateur de choisir un horaire précis à l'intérieur de la demi-journée/journée " +
      "sélectionnée) — doit correspondre à un créneau de GET /availability ou rester dans les bornes indiquées.",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'startTime doit être au format HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({
    example: '12:00',
    description:
      "Requis pour les espaces facturés à l'heure ou à l'activité. Optionnel pour les espaces facturés à la " +
      'journée (voir startTime).',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: 'endTime doit être au format HH:mm' })
  endTime?: string;

  // --- Requis UNIQUEMENT pour les espaces facturés à la journée (ex: hot desk, bureau privé) ---
  @ApiPropertyOptional({
    enum: DurationType,
    description: "Requis pour les espaces facturés à la journée : half_day, full_day ou multi_day",
  })
  @IsOptional()
  @IsEnum(DurationType)
  durationType?: DurationType;

  @ApiPropertyOptional({
    enum: HalfDayPeriod,
    description: 'Requis uniquement si durationType = half_day',
  })
  @IsOptional()
  @IsEnum(HalfDayPeriod)
  halfDayPeriod?: HalfDayPeriod;

  @ApiPropertyOptional({
    example: 3,
    description: 'Requis uniquement si durationType = multi_day (minimum 2)',
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  numberOfDays?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Nombre de personnes pour la réservation (utile pour Rooftop, privatisation, table ou événement).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  // --- Requis UNIQUEMENT pour les espaces facturés à l'activité (ex: Game Zone, privatisation Rooftop) ---
  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description:
      "Requis pour les espaces avec pricingUnit = activity. Référence l'id d'une SpaceActivityPricing (ex: billard, privatisation soirée). Voir GET /coworking/spaces/:id/activities. " +
      "Ne doit PAS être fourni pour un autre type d'espace (IRRELEVANT_ACTIVITY_ID).",
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiProperty({
    enum: PaymentMode,
    example: PaymentMode.wallet,
    description: 'wallet = débit immédiat | subscription = déduction du quota abonnement',
  })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ description: 'Requis uniquement si paymentMode = subscription' })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}