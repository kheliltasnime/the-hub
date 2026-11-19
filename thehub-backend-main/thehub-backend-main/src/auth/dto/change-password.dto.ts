import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'AncienMotDePasse123!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}