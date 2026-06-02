import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddressService } from './service.js';

vi.mock('@/config/db.js', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      addresses: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AddressService', () => {
  let addressService: AddressService;

  beforeEach(() => {
    vi.clearAllMocks();
    addressService = new AddressService();
  });

  const userId = 'user-123';
  const addressId = 'addr-456';

  describe('list', () => {
    it('should return addresses for the given user', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddresses = [
        { id: '1', label: 'Home', isDefault: true },
        { id: '2', label: 'Office', isDefault: false },
      ];
      (db.query.addresses.findMany as any).mockResolvedValue(mockAddresses);

      const result = await addressService.list(userId);

      expect(result).toEqual(mockAddresses);
      expect(db.query.addresses.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create an address without unsetting defaults when isDefault is false and user has addresses', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId, label: 'Home', address: '123 Main St', isDefault: false };

      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ cnt: 2 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      const data = { label: 'Home', recipientName: 'John', phone: '123', address: '123 Main St', city: 'Dhaka', area: 'Dhanmondi', isDefault: false };

      const result = await addressService.create(userId, data);

      expect(result).toEqual(mockAddress);
      expect(mockTx.update).not.toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(mockTx.values).toHaveBeenCalledWith({ ...data, userId });
    });

    it('should unset other defaults when isDefault is true', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId, label: 'Home', address: '123 Main St', isDefault: true };

      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ cnt: 2 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      const data = { label: 'Home', recipientName: 'John', phone: '123', address: '123 Main St', city: 'Dhaka', area: 'Dhanmondi', isDefault: true };

      const result = await addressService.create(userId, data);

      expect(result).toEqual(mockAddress);
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith({ isDefault: false });
    });

    it('should force first address to be default even if isDefault is false', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId, label: 'Home', address: '123 Main St', isDefault: true };

      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ cnt: 0 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      const data = { label: 'Home', recipientName: 'John', phone: '123', address: '123 Main St', city: 'Dhaka', area: 'Dhanmondi', isDefault: false };

      const result = await addressService.create(userId, data);

      expect(result).toEqual(mockAddress);
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith({ isDefault: false });
      expect(mockTx.values).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true, userId }));
    });
  });

  describe('update', () => {
    it('should update an existing address', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId, label: 'Office', address: '456 Park Ave', isDefault: false };

      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      const data = { label: 'Office' };

      const result = await addressService.update(userId, addressId, data);

      expect(result).toEqual(mockAddress);
      expect(mockTx.set).toHaveBeenCalledWith(expect.objectContaining({ ...data, updatedAt: expect.any(Date) }));
    });

    it('should throw NotFoundError when address does not exist', async () => {
      const { db } = await import('@/config/db.js');

      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      await expect(addressService.update(userId, addressId, { label: 'Office' })).rejects.toThrow('Address');
    });

    it('should unset other defaults when setting isDefault to true', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId, label: 'Home', isDefault: true };

      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => fn(mockTx));

      await addressService.update(userId, addressId, { isDefault: true });

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith({ isDefault: false });
    });
  });

  describe('delete', () => {
    it('should delete an existing address', async () => {
      const { db } = await import('@/config/db.js');
      const mockAddress = { id: addressId, userId };

      const mockChain = {
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAddress]),
      };
      (db.delete as any).mockReturnValue(mockChain);

      const result = await addressService.delete(userId, addressId);

      expect(result).toEqual(mockAddress);
      expect(db.delete).toHaveBeenCalled();
      expect(mockChain.where).toHaveBeenCalled();
      expect(mockChain.returning).toHaveBeenCalled();
    });

    it('should throw NotFoundError when address does not exist', async () => {
      const { db } = await import('@/config/db.js');

      const mockChain = {
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      (db.delete as any).mockReturnValue(mockChain);

      await expect(addressService.delete(userId, addressId)).rejects.toThrow('Address');
    });
  });
});
