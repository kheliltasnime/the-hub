const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.order.findUnique({
  where: { id: "fbf5e033-30a2-4856-8678-c29cc8e86141" },
  select: { statut: true, walletTransactionId: true, walletReferenceId: true, totalPrix: true },
}).then((res) => { console.log(res); return prisma.$disconnect(); });
