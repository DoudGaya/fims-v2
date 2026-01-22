
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Inspection ---');

  // 1. Total Users
  const totalUsers = await prisma.user.count();
  console.log(`Total Users: ${totalUsers}`);

  // 2. Users by Role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });
  console.log('Users by Role:', JSON.stringify(usersByRole, null, 2));

  // 3. Total Agents (Agent model)
  const totalAgentProfiles = await prisma.agent.count();
  console.log(`Total Agent Profiles: ${totalAgentProfiles}`);

  // 4. Agents by Status
  const agentsByStatus = await prisma.agent.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Agents by Status:', JSON.stringify(agentsByStatus, null, 2));

  // 5. Users with role 'agent' but NO Agent profile
  const agentsWithoutProfile = await prisma.user.count({
    where: {
      role: 'agent',
      agent: null
    }
  });
  console.log(`Users with role='agent' but NO profile: ${agentsWithoutProfile}`);

  // 6. Inspect the first 10 'agent' users to see what they look like
  const sampleAgents = await prisma.user.findMany({
    where: { role: 'agent' },
    take: 10,
    select: {
      id: true,
      email: true,
      role: true,
      agent: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });
  console.log('Sample Agents:', JSON.stringify(sampleAgents, null, 2));

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
