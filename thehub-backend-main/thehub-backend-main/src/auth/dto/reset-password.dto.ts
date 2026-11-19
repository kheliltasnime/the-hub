import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token reçu par email (lien de réinitialisation)' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}