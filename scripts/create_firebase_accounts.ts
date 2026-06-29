import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

// Initialize Firebase Admin SDK using env values
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '1234567890';
const SALT_ROUNDS = 10;

async function main() {
  // Get all active agents without a firebaseUid
  const agents = await prisma.agent.findMany({
    where: { status: 'active', user: { firebaseUid: null } },
    select: { id: true, user: { select: { id: true, email: true } } },
  });

  console.log(`Found ${agents.length} active agents without Firebase UID.`);
  if (agents.length === 0) return;

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  for (const agent of agents) {
    const user = agent.user;
    if (!user?.email) {
      console.warn(`Agent ${agent.id} has no email; skipping Firebase creation.`);
      continue;
    }

    let firebaseUid: string;
    try {
      // Try to create Firebase user
      const firebaseUser = await admin.auth().createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
      });
      firebaseUid = firebaseUser.uid;
      console.log(`Created Firebase UID ${firebaseUid} for agent ${agent.id}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        // Fetch existing user and update password
        const existingUser = await admin.auth().getUserByEmail(user.email);
        firebaseUid = existingUser.uid;
        await admin.auth().updateUser(firebaseUid, {
          password: DEFAULT_PASSWORD,
        });
        console.log(`Updated existing Firebase UID ${firebaseUid} password for agent ${agent.id}`);
      } else {
        console.error(`Failed to handle Firebase user for agent ${agent.id}:`, error);
        continue;
      }
    }

    // Update User record with Firebase UID and default password
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        firebaseUid,
        password: hashedPassword, 
        passwordChangeRequired: true 
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
