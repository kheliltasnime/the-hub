import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateWalkInOrderDto } from './create-walkin-order.dto';
import { PayOrderDto } from './pay-order.dto';

class KdsSyncActionDto {
  @IsString() orderId!: string;
  @IsString() statut!: string;
  @IsOptional() @IsString() reason?: string;
  @IsString() clientTimestamp!: string;
}

export class SyncKdsQueueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KdsSyncActionDto)
  actions!: KdsSyncActionDto[];
}

class PosSyncActionDto {
  @IsIn(['create_walkin', 'pay'])
  type!: 'create_walkin' | 'pay';

  @IsOptional() @IsString() clientRequestId?: string;
  @IsOptional() @IsString() orderId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWalkInOrderDto)
  dto?: any; // validé plus finement selon `type` au niveau service
}

export class SyncPosQueueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSyncActionDto)
  actions!: PosSyncActionDto[];
}