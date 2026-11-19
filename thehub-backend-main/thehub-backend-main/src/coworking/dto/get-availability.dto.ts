import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAvailabilityDto {
  @ApiProperty({ example: '2026-07-25', description: 'Date au format ISO (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;
}