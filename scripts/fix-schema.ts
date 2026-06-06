import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/config/db.js";

async function main() {
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" varchar(500);`);
  console.log("✓ users.avatar ensured");

  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "consignment_id" integer;`);
  console.log("✓ orders.consignment_id ensured");

  // Mark 0001 + 0002 as applied so future `pnpm db:migrate` is a no-op.
  // Hashes = sha256 of the .sql files.
  const rows = await db.execute(sql`
    SELECT hash FROM drizzle.__drizzle_migrations
  `);
  const existing = new Set(
    (rows as unknown as Array<{ hash: string }>).map((r) => r.hash),
  );

  const inserts: Array<{ hash: string; when: number }> = [
    {
      hash: "a127065278e984474d317e5309b5c6aa6f0b305a469fde389d0c24731c50d3fa",
      when: 1780375804015,
    },
    {
      hash: "b66a79400c3d79b9ec515816297d129c0a06b1ea8622926be8ac6d88c91d6c79",
      when: 1780377623347,
    },
  ];

  for (const m of inserts) {
    if (existing.has(m.hash)) {
      console.log(`· migration ${m.hash.slice(0, 8)} already recorded`);
      continue;
    }
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${m.hash}, ${m.when})
    `);
    console.log(`✓ recorded migration ${m.hash.slice(0, 8)}`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
