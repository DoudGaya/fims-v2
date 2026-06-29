// scripts/set_default_passwords.ts
// Migration script: Set default password '1234567890' for all active agents.
// Run with: npx tsx scripts/set_default_passwords.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '1234567890';
const SALT_ROUNDS = 10;

async function main() {
  // Find all agents with status 'active'
  const activeAgents = await prisma.agent.findMany({
    where: { status: 'active' },
    select: { id: true, userId: true },
  });

  console.log(`Found ${activeAgents.length} active agents.`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // Update the associated User records with the hashed password and require change on next login
  const updatePromises = activeAgents.map((agent) =>
    prisma.user.update({
      where: { id: agent.userId },
      data: { password: hashedPassword, passwordChangeRequired: true },
    })
  );

  const results = await Promise.all(updatePromises);
  console.log(`Updated passwords for ${results.length} users.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
