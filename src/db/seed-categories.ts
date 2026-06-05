import 'dotenv/config';

/**
 * Category Seed Script
 * --------------------
 * Creates 12 product categories and reassigns the existing products to them
 * (replacing the single "general" category they were initially seeded under).
 *
 * Idempotent: categories are matched by slug; product reassignment is a
 * simple slug-based lookup.
 *
 * Run with:
 *   npx tsx src/db/seed-categories.ts
 */

import { db } from '@/config/db.js';
import { products } from '@/db/schema/product.js';
import { categories } from '@/db/schema/category.js';
import { eq } from 'drizzle-orm';

// ─── Category catalogue ──────────────────────────────────────────────────────

type CategorySeed = { name: string; slug: string; description: string };

const CATEGORY_SEEDS: CategorySeed[] = [
    { name: 'Audio',                    slug: 'audio',                    description: 'Earbuds, headphones, speakers and other audio gear' },
    { name: 'Wearables',                slug: 'wearables',                description: 'Smartwatches and fitness trackers' },
    { name: 'Charging & Power',         slug: 'charging-power',           description: 'Power banks, chargers, wireless charging and USB hubs' },
    { name: 'Computer Accessories',     slug: 'computer-accessories',     description: 'Mice, keyboards, laptop stands, webcams and storage' },
    { name: 'Home & Kitchen',           slug: 'home-kitchen',             description: 'Appliances, cookware and cleaning for the home' },
    { name: 'Bags & Travel',            slug: 'bags-travel',              description: 'Backpacks, bags, wallets and travel essentials' },
    { name: 'Apparel & Footwear',       slug: 'apparel-footwear',         description: 'Clothing, shoes and accessories' },
    { name: 'Office & Stationery',      slug: 'office-stationery',        description: 'Notebooks, pens and writing supplies' },
    { name: 'Outdoor & Fitness',        slug: 'outdoor-fitness',          description: 'Camping, yoga, training and outdoor gear' },
    { name: 'Pet Supplies',             slug: 'pet-supplies',             description: 'Products for cats, dogs and other pets' },
    { name: 'Photography & Video',      slug: 'photography-video',        description: 'Cameras, projectors and phone mounts' },
    { name: 'Lighting & Desk',          slug: 'lighting-desk',            description: 'Desk lamps, monitor lights and desk organizers' },
];

// ─── Product → Category mapping (by slug) ────────────────────────────────────

const PRODUCT_CATEGORY: Record<string, string> = {
    'wireless-earbuds':     'audio',
    'bluetooth-speaker':    'audio',
    'headphones':           'audio',

    'smart-watch':          'wearables',
    'fitness-tracker':      'wearables',

    'power-bank':           'charging-power',
    'usb-c-charger':        'charging-power',
    'wireless-charger':     'charging-power',
    'usb-hub':              'charging-power',

    'gaming-mouse':         'computer-accessories',
    'mechanical-keyboard':  'computer-accessories',
    'laptop-stand':         'computer-accessories',
    'webcam':               'computer-accessories',
    'external-ssd':         'computer-accessories',

    'coffee-grinder':       'home-kitchen',
    'electric-kettle':      'home-kitchen',
    'air-fryer':            'home-kitchen',
    'vacuum-cleaner':       'home-kitchen',
    'robot-vacuum':         'home-kitchen',

    'travel-backpack':      'bags-travel',
    'crossbody-bag':        'bags-travel',
    'leather-wallet':       'bags-travel',
    'water-bottle':         'bags-travel',

    'winter-jacket':        'apparel-footwear',
    'cotton-tshirt':        'apparel-footwear',
    'sunglasses':           'apparel-footwear',
    'running-shoes':        'apparel-footwear',

    'office-notebook':      'office-stationery',
    'gel-pen':              'office-stationery',
    'sketchbook':           'office-stationery',

    'camping-lantern':      'outdoor-fitness',
    'yoga-mat':             'outdoor-fitness',
    'resistance-bands':     'outdoor-fitness',

    'pet-fountain':         'pet-supplies',
    'cat-scratching-post':  'pet-supplies',

    'action-camera':        'photography-video',
    'mini-projector':       'photography-video',
    'phone-tripod':         'photography-video',

    'monitor-light':        'lighting-desk',
    'desk-organizer':       'lighting-desk',
    'desk-lamp':            'lighting-desk',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertCategory(seed: CategorySeed): Promise<string> {
    const existing = await db.query.categories.findFirst({
        where: eq(categories.slug, seed.slug),
    });
    if (existing) {
        return existing.id;
    }
    const [row] = await db
        .insert(categories)
        .values({
            name: seed.name,
            slug: seed.slug,
            description: seed.description,
            isActive: true,
        })
        .returning();
    if (!row) throw new Error(`Failed to create category ${seed.slug}`);
    return row.id;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log(`🌱  Creating ${CATEGORY_SEEDS.length} categories…\n`);

    const slugToId = new Map<string, string>();
    for (const c of CATEGORY_SEEDS) {
        const id = await upsertCategory(c);
        slugToId.set(c.slug, id);
        console.log(`  ✅  ${c.name} (${c.slug})`);
    }

    console.log(`\n🔗  Reassigning ${Object.keys(PRODUCT_CATEGORY).length} products…\n`);

    let updated = 0;
    let missing = 0;
    for (const [productSlug, categorySlug] of Object.entries(PRODUCT_CATEGORY)) {
        const categoryId = slugToId.get(categorySlug);
        if (!categoryId) {
            console.error(`  ❌  Category not found for slug: ${categorySlug}`);
            missing += 1;
            continue;
        }

        const result = await db
            .update(products)
            .set({ categoryId, updatedAt: new Date() })
            .where(eq(products.slug, productSlug))
            .returning({ id: products.id });

        if (result.length === 0) {
            console.warn(`  ⚠️   Product not found: ${productSlug}`);
        } else {
            console.log(`  ✅  ${productSlug} → ${categorySlug}`);
            updated += 1;
        }
    }

    console.log(`\n📊  Summary — categories: ${CATEGORY_SEEDS.length}, products updated: ${updated}, missing: ${missing}`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});
