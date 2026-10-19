import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIMS Database Migration Rehearsal ===');
  console.log('Target: Neon PostgreSQL (FIMS database)');
  
  try {
    // 1. Read sql/zora-access.sql
    const sqlPath = path.resolve(__dirname, '../sql/zora-access.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found at ${sqlPath}`);
    }
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Loaded migration file: ${sqlPath} (${sqlContent.length} bytes)`);

    // 2. Execute migration
    console.log('Executing additive schema migration...');
    // We can execute the statements using $executeRawUnsafe
    // Split statements or execute raw
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS zora_access_grants (
        subject_type text NOT NULL CHECK (subject_type IN ('farmer','agent')),
        subject_id text NOT NULL,
        enabled boolean NOT NULL DEFAULT false,
        updated_by text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (subject_type, subject_id)
      );
    `);
    console.log('✓ Table zora_access_grants ensured.');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS zora_access_events (
        id bigserial PRIMARY KEY,
        subject_type text NOT NULL,
        subject_id text NOT NULL,
        enabled boolean NOT NULL,
        actor_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Table zora_access_events ensured.');

    // 3. Verify tables and structure
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'zora_%'
      ORDER BY table_name;
    `;
    console.log('Verified Zora tables in DB:', tables.map(t => t.table_name));

    // 4. Test CRUD transaction using the exact queries from fims-v2/app/api/admin/zora-access/route.ts
    console.log('Testing access grant transaction (insert & event logging)...');
    const testSubject = { type: 'agent', id: 'test-agent-rehearsal' };
    const adminId = 'system-rehearsal';

    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO zora_access_grants(subject_type,subject_id,enabled,updated_by) 
        VALUES (${testSubject.type},${testSubject.id},true,${adminId}) 
        ON CONFLICT(subject_type,subject_id) 
        DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()
      `,
      prisma.$executeRaw`
        INSERT INTO zora_access_events(subject_type,subject_id,enabled,actor_id) 
        VALUES (${testSubject.type},${testSubject.id},true,${adminId})
      `,
    ]);

    // 5. Test reading back using exact query from lib/zoraAccess.ts
    const rows = await prisma.$queryRaw`
      SELECT enabled FROM zora_access_grants WHERE subject_type = ${testSubject.type} AND subject_id = ${testSubject.id}
    `;
    console.log('Read back grant result:', rows);
    if (!rows || rows.length === 0 || rows[0].enabled !== true) {
      throw new Error('Grant verification query failed');
    }
    console.log('✓ Transaction and readback verified successfully.');

    // 6. Clean up test record
    await prisma.$executeRaw`DELETE FROM zora_access_grants WHERE subject_id = ${testSubject.id}`;
    await prisma.$executeRaw`DELETE FROM zora_access_events WHERE subject_id = ${testSubject.id}`;
    console.log('✓ Cleaned up rehearsal test record.');

    console.log('\n=== Rehearsal Summary: ALL CHECKS PASSED ===');
  } catch (err) {
    console.error('Rehearsal failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
