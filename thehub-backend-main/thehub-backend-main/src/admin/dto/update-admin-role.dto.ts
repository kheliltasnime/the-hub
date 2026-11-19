import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ADMIN_ASSIGNABLE_ROLES } from './create-admin-account.dto';

export class UpdateAdminRoleDto {
  @ApiProperty({ enum: ADMIN_ASSIGNABLE_ROLES, example: Role.manager_coworking })
  @IsIn(ADMIN_ASSIGNABLE_ROLES)
  role!: Role;
}