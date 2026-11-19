import { IsString, Matches, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TabletLoginDto {
  @ApiProperty({ example: 'tablette-kds-03' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: '1234', description: '4 chiffres KDS, 6 chiffres POS' })
  @Matches(/^\d{4,6}$/, { message: 'PIN invalide' })
  pin!: string;

  @ApiPropertyOptional({
    example: 'chef.brew@thehubghazela.tn',
    description: 'Requis uniquement pour le rôle kds_chef',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}