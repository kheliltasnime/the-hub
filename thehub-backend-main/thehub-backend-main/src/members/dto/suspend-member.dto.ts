import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendMemberDto {
  @ApiProperty({
    example: 'Comportement abusif signalé par le SAV (ticket #1234)',
    description: 'Motif obligatoire — journalisé pour audit',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}