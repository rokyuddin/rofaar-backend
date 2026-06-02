import { db } from "@/config/db.js";
import { products, productImages } from "@/db/schema/product.js";
import { eq, sql } from "drizzle-orm";

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 800;

// Category-specific image seeds for better relevance
const PRODUCT_SEEDS: Record<string, string[]> = {
  "earbuds": ["earbuds", "headphones", "audio"],
  "smart-watch": ["smartwatch", "watch", "wearable"],
  "power-bank": ["powerbank", "battery", "charger"],
  "usb-c-charger": ["charger", "usb", "cable"],
  "gaming-mouse": ["mouse", "gaming", "peripheral"],
  "mechanical-keyboard": ["keyboard", "mechanical", "typing"],
  "laptop-stand": ["laptop", "stand", "desk"],
  "webcam": ["webcam", "camera", "video"],
  "headphones": ["headphones", "music", "audio"],
  "bluetooth-speaker": ["speaker", "bluetooth", "music"],
  "desk-lamp": ["lamp", "light", "desk"],
  "phone-tripod": ["tripod", "phone", "stand"],
  "fitness-tracker": ["fitness", "tracker", "watch"],
  "wireless-charger": ["charger", "wireless", "phone"],
  "action-camera": ["camera", "action", "gopro"],
  "mini-projector": ["projector", "theater", "home"],
  "external-ssd": ["ssd", "storage", "drive"],
  "usb-hub": ["usb", "hub", "ports"],
  "monitor-light": ["monitor", "light", "screen"],
  "desk-organizer": ["organizer", "desk", "office"],
  "coffee-grinder": ["coffee", "grinder", "beans"],
  "electric-kettle": ["kettle", "boiler", "water"],
  "air-fryer": ["airfryer", "cooking", "kitchen"],
  "vacuum-cleaner": ["vacuum", "cleaner", "floor"],
  "robot-vacuum": ["robot", "vacuum", "cleaning"],
  "water-bottle": ["bottle", "water", "stainless"],
  "travel-backpack": ["backpack", "travel", "bag"],
  "camping-lantern": ["lantern", "camping", "light"],
  "yoga-mat": ["yoga", "mat", "fitness"],
  "resistance-bands": ["bands", "fitness", "exercise"],
  "running-shoes": ["shoes", "running", "sneakers"],
  "sunglasses": ["sunglasses", "eyewear", "fashion"],
  "leather-wallet": ["wallet", "leather", "accessory"],
  "crossbody-bag": ["bag", "crossbody", "fashion"],
  "winter-jacket": ["jacket", "winter", "coat"],
  "cotton-tshirt": ["t-shirt", "cotton", "apparel"],
  "office-notebook": ["notebook", "office", "stationery"],
  "gel-pen": ["pen", "stationery", "writing"],
  "sketchbook": ["sketchbook", "art", "drawing"],
  "pet-fountain": ["pet", "fountain", "water"],
  "cat-scratching-post": ["cat", "scratching", "pet"],
  "dog-leash": ["dog", "leash", "pet"],
  "garden-hose": ["garden", "hose", "water"],
  "plant-pot": ["plant", "pot", "garden"],
  "solar-garden-light": ["solar", "light", "garden"],
  "car-phone-holder": ["car", "phone", "holder"],
  "dash-camera": ["dashcam", "car", "camera"],
  "tool-kit": ["tools", "kit", "hardware"],
  "portable-fan": ["fan", "portable", "cooling"],
  "electric-juicer": ["juicer", "kitchen", "appliance"],
};

function getImageSeed(slug: string, index: number = 0): string {
  const seeds = PRODUCT_SEEDS[slug];
  if (seeds && seeds[index]) {
    return seeds[index];
  }
  // Fallback: use slug itself
  return `${slug}-${index}`;
}

function getImageUrl(slug: string, index: number = 0): string {
  const seed = getImageSeed(slug, index);
  return `https://picsum.photos/seed/${seed}/${IMAGE_WIDTH}/${IMAGE_HEIGHT}`;
}

async function main() {
  console.log("Fetching all products...");
  const allProducts = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .orderBy(products.createdAt);

  console.log(`Found ${allProducts.length} products total.`);

  let updated = 0;
  let skipped = 0;

  for (const product of allProducts) {
    if (!product.slug) {
      console.log(`  SKIP ${product.name} (no slug)`);
      skipped++;
      continue;
    }

    // Delete old images
    await db
      .delete(productImages)
      .where(eq(productImages.productId, product.id));

    // Insert 3 images per product
    const images = [0, 1, 2].map((index) => ({
      productId: product.id,
      url: getImageUrl(product.slug, index),
      sortOrder: index,
    }));

    await db.insert(productImages).values(images);
    updated++;
    console.log(
      `  OK  ${product.name.padEnd(25)} → 3 images (${images.map((i) => i.url).join(", ")})`,
    );
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
