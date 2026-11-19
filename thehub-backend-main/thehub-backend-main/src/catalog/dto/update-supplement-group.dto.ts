import { PartialType } from '@nestjs/swagger';
import { CreateSupplementGroupDto } from './create-supplement-group.dto';

export class UpdateSupplementGroupDto extends PartialType(CreateSupplementGroupDto) {}