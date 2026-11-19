const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.walletAuditLog.findMany({
  where: { action: 'refund' },
  orderBy: { createdAt: 'desc' },
  take: 3,
}).then((res) => { console.log(res); return prisma.$disconnect(); });
