import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/config/db.js";

async function main() {
  const cols = await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users','categories','products','brands','orders')
    ORDER BY table_name, ordinal_position
  `);
  console.log("COLUMNS:");
  for (const r of cols as unknown as Array<{ table_name: string; column_name: string }>) {
    console.log(`  ${r.table_name}.${r.column_name}`);
  }

  const mig = await db.execute(sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `);
  console.log("\nMIGRATIONS JOURNAL:");
  for (const r of mig as unknown as Array<{ id: number; hash: string; created_at: number | string }>) {
    console.log(`  #${r.id}  hash=${r.hash}  at=${r.created_at}`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
