require('dotenv').config();
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error('❌ Missing REDIS_URL environment variable. Set it in your .env file.');
  process.exit(1);
}

// Replace with your actual project ID, or also pull from env if it varies per environment
const PROJECT_ID = process.env.PROJECT_ID || 'deafening-dead-planet';

const publisher = new Redis(REDIS_URL);

async function testPublish() {
  try {
    console.log('🔌 Connecting to Redis...');
    await publisher.ping();
    console.log('✅ Connected to Redis');

    const channel = `logs:${PROJECT_ID}`;
    const message = JSON.stringify({ log: '🧪 Test message from manual script' });

    console.log(`📤 Publishing to channel: ${channel}`);
    console.log(`📦 Message: ${message}`);

    const numSubscribers = await publisher.publish(channel, message);
    console.log(`✅ Published to ${numSubscribers} subscriber(s)`);

    if (numSubscribers === 0) {
      console.log('⚠️ Warning: No subscribers listening to this channel!');
      console.log('Make sure your api-server is running and subscribed to logs:*');
    }

    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const testMsg = JSON.stringify({ log: `🧪 Test message ${i}` });
      await publisher.publish(channel, testMsg);
      console.log(`✅ Published test message ${i}`);
    }

    console.log('✅ Test complete!');
    await publisher.quit();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err);
    await publisher.quit();
    process.exit(1);
  }
}

testPublish();