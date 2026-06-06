import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/config/db.js";
import { users } from "@/db/schema/user.js";
import { roles } from "@/db/schema/rbac.js";

const PHONE = "01962349914";
const PASSWORD = "1234";
const EMAIL = "rofaar.official@gmail.com";
const NAME = "Rofaar";

async function main() {
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.name, "super_admin"),
  });
  if (!superAdminRole) {
    throw new Error(
      "super_admin role not found. Run your RBAC seed (or insert it into the roles table) first.",
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.phone, PHONE),
  });
  if (existing) {
    console.log(`User with phone ${PHONE} already exists (id=${existing.id}).`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const [created] = await db
    .insert(users)
    .values({
      name: NAME,
      email: EMAIL,
      phone: PHONE,
      passwordHash,
      roleId: superAdminRole.id,
      registrationStep: "completed",
      isVerified: true,
      isActive: true,
    })
    .returning({ id: users.id });

  console.log(`Created super_admin user: ${created?.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
