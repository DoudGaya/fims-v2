import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api/mobile';
const TEST_TOKEN = 'TEST_TOKEN_123';

async function fetchApi(path: string, method: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status} on ${path}: ${err}`);
  }
  
  return res.json();
}

async function runTests() {
  console.log('--- Starting API Tests ---');

  // 1. Setup Test User
  console.log('Setting up test agent...');
  let agentUser = await prisma.user.findFirst({ where: { email: 'testagent@example.com' } });
  if (!agentUser) {
    agentUser = await prisma.user.create({
      data: {
        email: 'testagent@example.com',
        role: 'agent',
        isActive: true,
        firebaseUid: 'test-uid-123',
        firstName: 'Test',
        lastName: 'Agent'
      }
    });
  }

  try {
    // 2. Test Auth Me
    console.log('Testing /auth/me...');
    const me = await fetchApi('/auth/me', 'GET');
    console.log('GET /auth/me success:', me.id === agentUser.id);

    // 2.5 Setup Test Cluster
    console.log('Setting up test cluster...');
    let cluster = await prisma.cluster.findFirst({ where: { title: 'Test Cluster' } });
    if (!cluster) {
      cluster = await prisma.cluster.create({
        data: {
          title: 'Test Cluster',
          clusterLeadFirstName: 'LeadFirst',
          clusterLeadLastName: 'LeadLast',
          clusterLeadEmail: 'lead@example.com',
          clusterLeadPhone: '08000000001'
        }
      });
    }

    // 3. Create Farmer
    console.log('Testing POST /farmers...');
    const farmerData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
      nin: `NIN${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      gender: 'Male',
      state: 'Kano',
      lga: 'Kano Municipal',
      ward: 'Tudun Wazirchi',
      farmSize: 5,
      primaryCrop: 'Maize',
      clusterId: cluster.id
    };
    const newFarmer = await fetchApi('/farmers', 'POST', farmerData);
    console.log('POST /farmers success. Farmer ID:', newFarmer.id);

    // 4. Create Farm
    console.log('Testing POST /farms...');
    const farmData = {
      farmerId: newFarmer.id,
      farmSize: 2.5,
      primaryCrop: 'Rice',
      farmLatitude: 11.99,
      farmLongitude: 8.52,
      farmingSeason: 'Wet Season'
    };
    const newFarm = await fetchApi('/farms', 'POST', farmData);
    console.log('POST /farms success. Farm ID:', newFarm.id);

    // 5. Get Farmers
    console.log('Testing GET /farmers...');
    const getFarmers = await fetchApi('/farmers', 'GET');
    console.log('GET /farmers success. Total farmers found:', getFarmers.pagination.total);

    // 6. Test Survey Fetching
    console.log('Testing GET /surveys...');
    const getSurveys = await fetchApi('/surveys', 'GET');
    console.log('GET /surveys success. Surveys count:', getSurveys.surveys?.length || 0);

    console.log('--- All API tests passed successfully! ---');
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
