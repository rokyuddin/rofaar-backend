import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from './service.js';

// Mock dependencies
vi.mock('@/config/db.js', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      products: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/shared/services/upload.js', () => ({
  uploadService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(() => Promise.resolve()),
  },
}));

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    productService = new ProductService();
  });

  describe('enrichProduct', () => {
    it('should calculate finalPrice correctly with discount', () => {
      const product = {
        price: '100.00',
        discountPercentage: 20,
      };
      
      // Accessing private method for testing
      const enriched = (productService as any).enrichProduct(product);
      
      expect(enriched.finalPrice).toBe(80);
    });

    it('should handle zero discount', () => {
      const product = {
        price: '100.00',
        discountPercentage: 0,
      };
      
      const enriched = (productService as any).enrichProduct(product);
      
      expect(enriched.finalPrice).toBe(100);
    });

    it('should round finalPrice to 2 decimal places', () => {
      const product = {
        price: '99.99',
        discountPercentage: 15,
      };
      // 99.99 * 0.85 = 84.9915 -> 84.99
      
      const enriched = (productService as any).enrichProduct(product);
      
      expect(enriched.finalPrice).toBe(84.99);
    });
  });

  describe('create', () => {
    it('should upload images and cleanup on failure', async () => {
      const { uploadService } = await import('@/shared/services/upload.js');
      const { db } = await import('@/config/db.js');
      
      // Mock upload to succeed
      (uploadService.uploadFile as any).mockResolvedValue('https://r2.com/test.jpg');
      
      // Mock DB to fail
      (db.transaction as any).mockRejectedValue(new Error('DB Fail'));

      const data: any = {
        name: 'Test Product',
        price: 100,
        costPrice: 50,
        discountPercentage: 10,
        imageFiles: [{ filename: 'test.jpg', mimetype: 'image/jpeg', data: Buffer.from('test') }]
      };

      await expect(productService.create(data)).rejects.toThrow('DB Fail');

      // Verify cleanup was called with folder prefix
      expect(uploadService.deleteFile).toHaveBeenCalledWith('products/test.jpg');
    });
  });
});
