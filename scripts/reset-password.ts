import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/config/db.js";
import { users } from "@/db/schema/user.js";

async function main() {
  const passwordHash = await bcrypt.hash("1234", 12);
  const [u] = await db
    .update(users)
    .set({
      email: "rofaar.official@gmail.com",
      name: "Rofaar",
      passwordHash,
      registrationStep: "completed",
      isVerified: true,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(users.phone, "01962349914"))
    .returning({ id: users.id, email: users.email });
  console.log("✓ updated", u);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
