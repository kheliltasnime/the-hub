const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const reservations = await p.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { space: { select: { name: true } }, user: { select: { email: true } } },
  });
  const spaces = await p.coworkingSpace.count();
  const user = await p.user.findFirst({
    where: { email: 'kheliltasnime@gmail.com' },
    select: { id: true, email: true, walletReferenceId: true },
  });
  console.log('spaces=', spaces);
  console.log('user=', JSON.stringify(user));
  console.log('reservations=', JSON.stringify(reservations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
