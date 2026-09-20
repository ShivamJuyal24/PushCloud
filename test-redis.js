require('dotenv').config();
const Redis = require('ioredis');

// Replace with your actual Redis URL
const REDIS_URL = 'rediss://default:AWa0AAIncDIxOWNiZTVhZWM1Zjk0MzQ1YjQwYzFjNTAwMDBkMzliYXAyMjYyOTI@fleet-man-26292.upstash.io:6379';

// Replace with your actual project ID
const PROJECT_ID = 'deafening-dead-planet';

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

    // Publish a few more test messages
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