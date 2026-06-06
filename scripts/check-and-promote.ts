import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/config/db.js";
import { users, roles } from "@/db/index.js";

async function main() {
  const u = await db.query.users.findFirst({
    where: eq(users.phone, "01962349914"),
    with: { role: true },
  });
  if (!u) {
    console.log("not found");
    process.exit(0);
  }
  console.log({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role?.name,
    registrationStep: u.registrationStep,
    isVerified: u.isVerified,
    isActive: u.isActive,
  });

  // Ensure super_admin role
  if (u.role?.name !== "super_admin") {
    const superRole = await db.query.roles.findFirst({
      where: eq(roles.name, "super_admin"),
    });
    if (!superRole) {
      console.log("\nNo super_admin role exists. Creating it.");
      const [r] = await db
        .insert(roles)
        .values({ name: "super_admin", description: "Super administrator" })
        .returning();
      await db.update(users).set({
        roleId: r!.id,
        registrationStep: "completed",
        isVerified: true,
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(users.id, u.id));
      console.log("✓ promoted to super_admin");
    } else {
      await db.update(users).set({
        roleId: superRole.id,
        registrationStep: "completed",
        isVerified: true,
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(users.id, u.id));
      console.log(`\n✓ promoted to super_admin (roleId=${superRole.id})`);
    }
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
