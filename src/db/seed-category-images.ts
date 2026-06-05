import 'dotenv/config';

/**
 * Category Image Update Script
 * ----------------------------
 * Adds a relevant Unsplash image to each category that doesn't have one.
 * Categories that already have an imageUrl are left untouched.
 *
 * Run with:
 *   npx tsx src/db/seed-category-images.ts
 */

import { db } from '@/config/db.js';
import { categories } from '@/db/schema/category.js';
import { eq, isNull, or } from 'drizzle-orm';

// ─── Image catalogue (one relevant image per category slug) ──────────────────

const CATEGORY_IMAGES: Record<string, string> = {
    'audio':                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&auto=format&q=80',
    'wearables':            'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=800&fit=crop&auto=format&q=80',
    'charging-power':       'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&h=800&fit=crop&auto=format&q=80',
    'computer-accessories': 'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=800&h=800&fit=crop&auto=format&q=80',
    'home-kitchen':         'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&auto=format&q=80',
    'bags-travel':          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&auto=format&q=80',
    'apparel-footwear':     'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop&auto=format&q=80',
    'office-stationery':    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=800&fit=crop&auto=format&q=80',
    'outdoor-fitness':      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=800&fit=crop&auto=format&q=80',
    'pet-supplies':         'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop&auto=format&q=80',
    'photography-video':    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop&auto=format&q=80',
    'lighting-desk':        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=800&fit=crop&auto=format&q=80',
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log(`🖼️   Assigning images to ${Object.keys(CATEGORY_IMAGES).length} categories…\n`);

    let updated = 0;
    let skipped = 0;
    let unknown = 0;

    for (const [slug, imageUrl] of Object.entries(CATEGORY_IMAGES)) {
        const existing = await db.query.categories.findFirst({
            where: eq(categories.slug, slug),
        });

        if (!existing) {
            console.warn(`  ⚠️   Category not found: ${slug}`);
            unknown += 1;
            continue;
        }

        if (existing.imageUrl) {
            console.log(`  ⏭️   Skip (already has image): ${slug}`);
            skipped += 1;
            continue;
        }

        await db
            .update(categories)
            .set({ imageUrl })
            .where(eq(categories.id, existing.id));

        console.log(`  ✅  ${slug} ← image set`);
        updated += 1;
    }

    console.log(`\n📊  Summary — updated: ${updated}, skipped: ${skipped}, unknown: ${unknown}`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌  Image seed failed:', err);
    process.exit(1);
});
