import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from './service.js';

// Mock dependencies
vi.mock('@/config/db.js', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      products: { findMany: vi.fn(), findFirst: vi.fn() },
      productVariants: { findMany: vi.fn(), findFirst: vi.fn() },
      productSpecs: { findMany: vi.fn() },
      productVariantAttributes: { findMany: vi.fn() },
    },
    select: vi.fn(() => ({ from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) })) })) })),
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

  describe('buildProductResponse', () => {
    it('simple product (hasVariants=false) mirrors price/sale_price/stock from the default variant', async () => {
      const product = {
        id: 'p1',
        name: 'Simple',
        slug: 'simple',
        status: 'published',
        hasVariants: false,
        discountPercentage: 20,
        freeShipping: false,
        weight: null,
        length: null,
        width: null,
        height: null,
        images: [],
        variants: [
          {
            id: 'v1',
            sku: 'SIMPLE-DEFAULT',
            name: 'Default',
            basePrice: '100.00',
            salePrice: null,
            stock: 7,
            isDefault: true,
            isActive: true,
            isLocked: true,
            sortOrder: 0,
            createdAt: new Date(),
          },
        ],
      };

      const enriched: any = await (productService as any).buildProductResponse(product);

      // Mirrored from the default variant
      expect(enriched.price).toBe(100);
      expect(enriched.salePrice).toBeNull();
      expect(enriched.stock).toBe(7);
      expect(enriched.inStock).toBe(true);
      // 100 * 0.8 = 80
      expect(enriched.finalPrice).toBe(80);
      // Simple product: only default_variant object, no variants array
      expect(enriched.defaultVariant).toEqual({
        variant_id: 'v1',
        sku: 'SIMPLE-DEFAULT',
        base_price: 100,
        sale_price: null,
        stock: 7,
      });
      expect(enriched.variants).toEqual([]);
      expect(enriched.priceRange).toBeNull();
      expect(enriched.defaultVariantId).toBeUndefined();
    });

    it('variable product (hasVariants=true) returns price_range + variants[] + default_variant_id', async () => {
      const product = {
        id: 'p2',
        name: 'Variable',
        slug: 'variable',
        status: 'published',
        hasVariants: true,
        discountPercentage: 0,
        freeShipping: true,
        weight: '1.5',
        length: '10',
        width: '5',
        height: '3',
        images: [
          { url: 'https://cdn/2.jpg', sortOrder: 1 },
          { url: 'https://cdn/1.jpg', sortOrder: 0 },
        ],
        variants: [
          {
            id: 'vA',
            sku: 'A',
            name: 'Small',
            basePrice: '50.00',
            salePrice: null,
            stock: 5,
            isDefault: true,
            isActive: true,
            isLocked: true,
            sortOrder: 0,
            createdAt: new Date(),
          },
          {
            id: 'vB',
            sku: 'B',
            name: 'Large',
            basePrice: '80.00',
            salePrice: '70.00',
            stock: 0,
            isDefault: false,
            isActive: true,
            isLocked: false,
            sortOrder: 1,
            createdAt: new Date(),
          },
        ],
      };

      const enriched: any = await (productService as any).buildProductResponse(product);

      expect(enriched.defaultVariantId).toBe('vA');
      expect(enriched.defaultVariant).toBeNull();
      expect(enriched.variants).toHaveLength(2);
      expect(enriched.variants[0].effectivePrice).toBe(50);
      expect(enriched.variants[0].inStock).toBe(true);
      expect(enriched.variants[1].effectivePrice).toBe(70); // sale price
      expect(enriched.variants[1].inStock).toBe(false); // stock=0
      // price range: min of effective (50, 70) = 50
      expect(enriched.priceRange).toEqual({ min: 50, max: 70 });
      // total stock = 5 + 0 = 5
      expect(enriched.stock).toBe(5);
      expect(enriched.inStock).toBe(true);
      // first image by sortOrder is primary
      expect(enriched.images[0].url).toBe('https://cdn/1.jpg');
      expect(enriched.images[0].isPrimary).toBe(true);
      // dimensions
      expect(enriched.dimensions).toEqual({
        weight: 1.5,
        length: 10,
        width: 5,
        height: 3,
      });
    });

    it('handles zero discount and rounds finalPrice to 2 decimals', async () => {
      const product = {
        id: 'p3',
        name: 'NoDiscount',
        slug: 'no-discount',
        status: 'published',
        hasVariants: false,
        discountPercentage: 0,
        freeShipping: false,
        weight: null,
        length: null,
        width: null,
        height: null,
        images: [],
        variants: [
          {
            id: 'vND',
            sku: 'ND-DEFAULT',
            name: 'Default',
            basePrice: '99.99',
            salePrice: null,
            stock: 1,
            isDefault: true,
            isActive: true,
            isLocked: true,
            sortOrder: 0,
            createdAt: new Date(),
          },
        ],
      };

      const enriched: any = await (productService as any).buildProductResponse(product);
      expect(enriched.price).toBe(99.99);
      expect(enriched.finalPrice).toBe(99.99);
    });

    it('applies discount on top of sale price for variable product finalPrice', async () => {
      const product = {
        id: 'p4',
        name: 'Discounted',
        slug: 'discounted',
        status: 'published',
        hasVariants: true,
        discountPercentage: 10,
        freeShipping: false,
        weight: null,
        length: null,
        width: null,
        height: null,
        images: [],
        variants: [
          {
            id: 'vD1',
            sku: 'D1',
            name: 'Default',
            basePrice: '100.00',
            salePrice: null,
            stock: 10,
            isDefault: true,
            isActive: true,
            isLocked: true,
            sortOrder: 0,
            createdAt: new Date(),
          },
        ],
      };

      const enriched: any = await (productService as any).buildProductResponse(product);
      // effective price 100, 10% off → 90
      expect(enriched.variants[0].effectivePrice).toBe(100);
      expect(enriched.variants[0].finalPrice).toBe(90);
      expect(enriched.priceRange).toEqual({ min: 100, max: 100 });
    });
  });
});
