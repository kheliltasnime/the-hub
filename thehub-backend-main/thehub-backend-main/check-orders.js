const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.order.groupBy({
  by: ['enseigneId', 'statut'],
  _count: true,
}).then((res) => { console.log(res); return prisma.$disconnect(); });
