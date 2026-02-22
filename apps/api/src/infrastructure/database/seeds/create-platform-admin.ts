import { db } from "../index";
import { platformAdmins, users } from "../schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";

async function createPlatformAdmin(
  email: string,
  password: string,
  name: string,
) {
  console.log(`Creating platform admin: ${email}`);

  // Verificar se usuário já existe
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log("User already exists, promoting to platform admin");
  } else {
    // Criar usuário
    const passwordHash = await bcrypt.hash(password, 10);
    const newUserResult = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        emailVerified: true, // Auto-verificado
        status: "active",
      })
      .returning();
    const newUser = (newUserResult as any[])[0];
    userId = newUser.id;
    console.log("User created");
  }

  // Verificar se já é platform admin
  const existingAdmin = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  if (existingAdmin.length > 0 && !existingAdmin[0].revokedAt) {
    console.log("User is already a platform admin");
    return;
  }

  // Criar platform admin
  await db.insert(platformAdmins).values({
    userId,
    createdBy: null, // Primeiro admin não tem creator
  });

  console.log("✅ Platform admin created successfully");
}

// Parse CLI args
const args = process.argv.slice(2);
const email = args
  .find((a) => a.startsWith("--email="))
  ?.split("=")[1];
const password = args
  .find((a) => a.startsWith("--password="))
  ?.split("=")[1];
const name =
  args
    .find((a) => a.startsWith("--name="))
    ?.split("=")[1] || "Platform Admin";

if (!email || !password) {
  console.error(
    "Usage: pnpm tsx src/infrastructure/database/seeds/create-platform-admin.ts --email=admin@healz.com --password=senha123 --name='Admin Name'",
  );
  process.exit(1);
}

createPlatformAdmin(email, password, name)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
