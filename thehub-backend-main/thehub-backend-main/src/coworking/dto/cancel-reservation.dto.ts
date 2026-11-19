import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelReservationDto {
  @ApiPropertyOptional({ example: 'Empêchement personnel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}