import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'asma.berkaya@thehubghazela.tn' })
  @IsEmail()
  email!: string;
}