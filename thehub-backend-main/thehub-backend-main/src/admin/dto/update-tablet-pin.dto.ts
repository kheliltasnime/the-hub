import { Matches } from 'class-validator';
   import { ApiProperty } from '@nestjs/swagger';

   export class UpdateTabletPinDto {
     @ApiProperty({
       example: '5678',
       description: 'Nouveau PIN — la longueur exacte attendue dépend du rôle du compte (4 KDS / 6 POS)',
     })
     @Matches(/^\d{4,6}$/, { message: 'Le PIN doit contenir uniquement des chiffres (4 pour KDS, 6 pour POS)' })
     pin!: string;
   }