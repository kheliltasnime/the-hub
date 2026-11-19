import { IsOptional, IsString } from 'class-validator';

export class SearchMenuDto {
  @IsOptional()
  @IsString()
  q?: string;
}
