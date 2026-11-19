import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';

// Modification : tout est optionnel sauf qu'on ne change jamais l'enseigne
// d'un article existant (éviterait des incohérences avec les commandes déjà passées).
export class UpdateMenuItemDto extends PartialType(OmitType(CreateMenuItemDto, ['enseigneId'] as const)) {}