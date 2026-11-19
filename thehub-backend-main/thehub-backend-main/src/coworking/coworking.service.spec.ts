import { CoworkingService } from './coworking.service';

describe('CoworkingService', () => {
  it('accepts half-hour rooftop activity slots', async () => {
    const prisma = {
      coworkingSpace: {
        findUnique: jest.fn(),
      },
      spaceActivityPricing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'activity-1',
          spaceId: 'space-1',
          price: 120,
          unit: 'activity',
          isActive: true,
        }),
      },
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      spaceBlock: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new CoworkingService(
      prisma,
      { emit: jest.fn() } as any,
      { scheduleReminders: jest.fn() } as any,
      {
        getOrCreateWalletReferenceId: jest.fn().mockResolvedValue('wallet-ref'),
        debit: jest.fn().mockResolvedValue({ ok: true }),
        refund: jest.fn().mockResolvedValue({ ok: true }),
      } as any,
    );

    const space = {
      id: 'space-1',
      name: 'Sky Lounge',
      type: 'rooftop',
      pricingUnit: 'activity',
      isActive: true,
      openingHour: '16:00',
      closingHour: '23:00',
      pricePerUnit: null,
    } as any;

    const slot = await (service as any).resolveSlot(space, {
      date: '2026-09-14',
      startTime: '18:30',
      endTime: '20:30',
      activityId: 'activity-1',
    });

    expect(slot.startTime).toBe('18:30');
    expect(slot.endTime).toBe('20:30');
    expect(slot.amount).toBe(120);
  });
});
