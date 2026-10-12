import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import https from 'https';

const prisma = new PrismaClient();

async function downloadImage(url: string, filepath: string) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects if necessary (basic support)
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          https.get(res.headers.location, (redirectRes) => {
             redirectRes.pipe(fs.createWriteStream(filepath))
               .on('error', reject)
               .once('close', () => resolve(filepath));
          }).on('error', reject);
          return;
        }
      }
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
           .on('error', reject)
           .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode} for URL: ${url}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching agents...');
  const agents = await prisma.agent.findMany({
    where: {
      address: {
        contains: 'Bako',
        mode: 'insensitive'
      },
      photoUrl: {
        not: null
      }
    },
    include: {
      user: true
    }
  });

  console.log(`Found ${agents.length} agents from Audu Bako College with photos.`);

  // If there are agents but we need to also get any from Kano, let's also fetch general Kano ones just in case
  const kanoAgents = await prisma.agent.findMany({
    where: {
      OR: [
        { assignedState: { contains: 'Kano', mode: 'insensitive' } },
        { state: { contains: 'Kano', mode: 'insensitive' } },
        { address: { contains: 'Kano', mode: 'insensitive' } }
      ],
      NOT: {
        address: { contains: 'Bako', mode: 'insensitive' }
      },
      photoUrl: {
        not: null
      }
    },
    include: {
      user: true
    }
  });
  
  console.log(`Found ${kanoAgents.length} other agents from Kano with photos.`);
  
  const allAgents = [...agents, ...kanoAgents];

  const dir = path.join(process.cwd(), '..', 'Kano colleges');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const agent of allAgents) {
    if (!agent.photoUrl) continue;
    
    // Construct name
    const name = `${agent.firstName || ''} ${agent.lastName || ''}`.trim().replace(/[^a-zA-Z0-9 ]/g, '');
    const filename = `${name || agent.id}.jpg`;
    const filepath = path.join(dir, filename);

    console.log(`Downloading image for ${name} (${agent.photoUrl})...`);
    try {
      await downloadImage(agent.photoUrl, filepath);
      successCount++;
    } catch (err) {
      console.error(`Failed to download for ${name}:`, err);
      failCount++;
    }
  }

  console.log(`\nFinished! Successfully downloaded ${successCount} images. Failed: ${failCount}.`);
  console.log(`Images saved in: ${dir}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
