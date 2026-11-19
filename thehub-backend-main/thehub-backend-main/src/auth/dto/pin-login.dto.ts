import { IsEmail, IsOptional, IsString } from 'class-validator';

export class PinLoginDto {
  @IsString()
  pin!: string;

  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}