import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachSupplementGroupsDto {
  @ApiProperty({
    example: ['uuid-groupe-sauces', 'uuid-groupe-toppings'],
    description: 'Liste complète des groupes de suppléments à associer à cet article (remplace la liste existante)',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds!: string[];
}