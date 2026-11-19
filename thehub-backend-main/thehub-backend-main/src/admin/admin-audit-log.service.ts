import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(filters: GetAuditLogsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.AdminAuditLogWhereInput = {
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.targetType && { targetType: filters.targetType }),
      ...(filters.targetId && { targetId: filters.targetId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}