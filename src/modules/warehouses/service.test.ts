import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarehouseService } from './service.js';

vi.mock('@/config/db.js', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      warehouses: { findMany: vi.fn(), findFirst: vi.fn() },
      productInventory: { findMany: vi.fn(), findFirst: vi.fn() },
      productVariants: { findFirst: vi.fn() },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'inv1' }])) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'inv1', quantity: 5 }])) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'w1' }])) })) })),
  },
}));

describe('WarehouseService', () => {
  let service: WarehouseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WarehouseService();
  });

  describe('create', () => {
    it('rejects duplicate warehouse code with ConflictError', async () => {
      const { db } = await import('@/config/db.js');
      (db.query.warehouses.findFirst as any).mockResolvedValue({
        id: 'w1',
        code: 'WH-1',
      });

      await expect(
        service.create({ name: 'Main', code: 'WH-1' } as any),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('delete', () => {
    it('refuses to delete warehouse that still has inventory', async () => {
      const { db } = await import('@/config/db.js');
      // Mock count() chain returning > 0
      (db.select as any) = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ value: 3 }])),
        })),
      }));

      await expect(service.delete('w1')).rejects.toThrow(/inventory record/);
    });
  });
});
