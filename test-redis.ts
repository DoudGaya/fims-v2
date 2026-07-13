import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env");
  process.exit(1);
}

const redis = new Redis({
  url,
  token,
});

async function testRedis() {
  try {
    console.log("Connecting to Upstash Redis...");
    
    // Set a test key
    await redis.set('test_connection', 'Success! Redis is working.');
    console.log("Set key 'test_connection'.");

    // Get the test key
    const val = await redis.get('test_connection');
    console.log("Retrieved value:", val);

    // Delete the test key
    await redis.del('test_connection');
    console.log("Deleted test key.");
    
    console.log("Redis test completed successfully.");
  } catch (error) {
    console.error("Redis test failed:", error);
  }
}

testRedis();
