import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permissions included for each mobile agent role
const ENROLLMENT_AGENT_PERMISSIONS = [
  'dashboard.access',
  'farmers.create',
  'farmers.read',
  'farms.create',
  'farms.read',
];

const DATA_CORRECTION_PERMISSIONS = [
  'dashboard.access',
  'farmers.read',
  'farmers.update',
];


const SURVEY_AGENT_PERMISSIONS = [
  'dashboard.access',
  'farmers.read',
  'surveys.read',
  'surveys.responses.read',
];

async function main() {
  console.log('Seeding mobile agent roles…');

  await prisma.roles.upsert({
    where: { name: 'agent' },
    update: {
      description: 'Field agent authorised to enroll farmers via the mobile app',
      permissions: ENROLLMENT_AGENT_PERMISSIONS,
      isActive: true,
    },
    create: {
      name: 'agent',
      description: 'Field agent authorised to enroll farmers via the mobile app',
      permissions: ENROLLMENT_AGENT_PERMISSIONS,
      isSystem: false,
      isActive: true,
    },
  });

  console.log('✓ agent (enrollment) role upserted');

  await prisma.roles.upsert({
    where: { name: 'data_correction_agent' },
    update: {
      description: 'Field agent authorised to search and correct farmer records via the mobile app',
      permissions: DATA_CORRECTION_PERMISSIONS,
      isActive: true,
    },
    create: {
      name: 'data_correction_agent',
      description: 'Field agent authorised to search and correct farmer records via the mobile app',
      permissions: DATA_CORRECTION_PERMISSIONS,
      isSystem: false,
      isActive: true,
    },
  });

  console.log('✓ data_correction_agent role upserted');

  await prisma.roles.upsert({
    where: { name: 'survey_agent' },
    update: {
      description: 'Field agent authorised to conduct farmer surveys via the mobile app',
      permissions: SURVEY_AGENT_PERMISSIONS,
      isActive: true,
    },
    create: {
      name: 'survey_agent',
      description: 'Field agent authorised to conduct farmer surveys via the mobile app',
      permissions: SURVEY_AGENT_PERMISSIONS,
      isSystem: false,
      isActive: true,
    },
  });

  console.log('✓ survey_agent role upserted');
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
