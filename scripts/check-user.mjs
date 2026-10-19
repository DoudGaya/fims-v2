import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const env = {};
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: 'pm@cosmopolitan.edu.ng', mode: 'insensitive' } },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  console.log('User found:', user.email, 'Role:', user.role);
  for (const ur of user.userRoles) {
    console.log(' - UserRole Name:', ur.role.name, 'ID:', ur.role.id);
    console.log('   Permissions count:', Array.isArray(ur.role.permissions) ? ur.role.permissions.length : 0);
  }

  // Import rolePermissions
  const rolePermissionsContent = fs.readFileSync(path.resolve(__dirname, '../lib/rolePermissions.ts'), 'utf8');
  // Check if dashboard.access is in admin
  console.log('rolePermissions.ts has dashboard.access in admin:', rolePermissionsContent.includes('admin:') && rolePermissionsContent.includes('PERMISSIONS.DASHBOARD_ACCESS'));

  const permissions = new Set();
  user.userRoles.forEach(userRole => {
    const rolePermissions = userRole.role.permissions;
    if (rolePermissions && Array.isArray(rolePermissions)) {
      rolePermissions.forEach(permission => permissions.add(permission));
    }
  });

  console.log('Final permissions count from DB userRoles:', permissions.size);
  console.log('Has dashboard.access permission?', permissions.has('dashboard.access'));
  console.log('Permissions list:', Array.from(permissions));

  await prisma.$disconnect();
}

main().catch(console.error);
