const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const enseigne = await p.enseigne.upsert({
    where: { id: 'a1111111-1111-4111-8111-111111111111' },
    update: { nom: 'Agence de Com', actif: true },
    create: {
      id: 'a1111111-1111-4111-8111-111111111111',
      nom: 'Agence de Com',
      actif: true,
    },
  });

  const spaces = [
    {
      id: 'b1111111-1111-4111-8111-111111111111',
      name: 'Studio Photo & Shooting',
      description: '40 m² · Capacité: 6 pers. · Éclairage Profoto inclus',
      type: 'studio_photo',
      capacityMin: 1,
      capacityMax: 6,
      pricePerUnit: 45,
      pricingUnit: 'hour',
      openingHour: '08:00',
      closingHour: '22:00',
      equipements: ['Shooting', 'Audio HD', '1Gbps'],
      enseigneId: enseigne.id,
      isActive: true,
    },
    {
      id: 'b2222222-2222-4222-8222-222222222222',
      name: 'Studio Podcast Broadcast',
      description: 'Acoustique insonorisée · 4 microphones Shure · Table de mixage Rode',
      type: 'studio_podcast',
      capacityMin: 1,
      capacityMax: 4,
      pricePerUnit: 60,
      pricingUnit: 'hour',
      openingHour: '08:00',
      closingHour: '22:00',
      equipements: ['Audio HD', 'Podcast', '1Gbps'],
      enseigneId: enseigne.id,
      isActive: true,
    },
    {
      id: 'b3333333-3333-4333-8333-333333333333',
      name: 'Suite de Montage 4K',
      description: 'Écran 4K calibré · DaVinci Resolve · Insonorisé',
      type: 'salle_reunion',
      capacityMin: 1,
      capacityMax: 2,
      pricePerUnit: 35,
      pricingUnit: 'hour',
      openingHour: '08:00',
      closingHour: '22:00',
      equipements: ['4K', 'Montage', '1Gbps'],
      enseigneId: enseigne.id,
      isActive: true,
    },
    {
      id: 'b4444444-4444-4444-8444-444444444444',
      name: 'Hot Desk Open Space',
      description: 'Poste flexible · Wi-Fi 1 Gbps · Café inclus',
      type: 'hot_desk',
      capacityMin: 1,
      capacityMax: 20,
      pricePerUnit: 40,
      pricingUnit: 'day',
      openingHour: '08:00',
      closingHour: '20:00',
      equipements: ['Wi-Fi', 'Café'],
      enseigneId: enseigne.id,
      isActive: true,
    },
    {
      id: 'b036f91f-538e-4780-b60b-273187034108',
      name: 'Sky Lounge',
      description: 'Détente, musique & vue panoramique',
      type: 'rooftop',
      capacityMin: 2,
      capacityMax: 20,
      pricePerUnit: 0,
      pricingUnit: 'activity',
      openingHour: '16:00',
      closingHour: '23:00',
      equipements: ['wifi', 'cafe', 'vue_panoramique'],
      enseigneId: null,
      isActive: true,
    },
  ];

  for (const space of spaces) {
    await p.coworkingSpace.upsert({
      where: { id: space.id },
      update: {
        name: space.name,
        description: space.description,
        type: space.type,
        capacityMin: space.capacityMin,
        capacityMax: space.capacityMax,
        pricePerUnit: space.pricePerUnit,
        pricingUnit: space.pricingUnit,
        openingHour: space.openingHour,
        closingHour: space.closingHour,
        equipements: space.equipements,
        enseigneId: space.enseigneId,
        isActive: true,
      },
      create: space,
    });
  }

  const rooftopActivity = await p.spaceActivityPricing.findFirst({
    where: { spaceId: 'b036f91f-538e-4780-b60b-273187034108', activity: 'privatisation_soiree' },
  });
  if (rooftopActivity) {
    await p.spaceActivityPricing.update({
      where: { id: rooftopActivity.id },
      data: { price: 30, unit: 'activity', isActive: true },
    });
  } else {
    await p.spaceActivityPricing.create({
      data: {
        spaceId: 'b036f91f-538e-4780-b60b-273187034108',
        activity: 'privatisation_soiree',
        price: 30,
        unit: 'activity',
        isActive: true,
      },
    });
  }

  const count = await p.coworkingSpace.count();
  console.log(`Seed OK — enseigne=${enseigne.nom}, spaces=${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
