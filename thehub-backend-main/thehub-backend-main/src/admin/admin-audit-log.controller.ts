import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminAuditLogService } from './admin-audit-log.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@ApiTags("Admin — Logs d'audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin) // §13.1 : lecture seule, Super Admin uniquement
@Controller('admin/audit-logs')
export class AdminAuditLogController {
  constructor(private readonly service: AdminAuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Historique de toutes les actions admin — qui, quoi, quand (§13.1)' })
  listAuditLogs(@Query() query: GetAuditLogsDto) {
    return this.service.listAuditLogs(query);
  }
}