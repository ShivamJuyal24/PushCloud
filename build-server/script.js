const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Redis = require('ioredis');

// Initialize Redis publisher
const publisher = new Redis(process.env.REDIS_URL);

// Track Redis ready state
let redisReady = false;

// Handle Redis connection events
publisher.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

publisher.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

publisher.on('ready', () => {
  console.log('✅ Redis is ready');
  redisReady = true;
});

// Initialize S3 client
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://host.docker.internal:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

const PROJECT_ID = process.env.PROJECT_ID;

// Fixed publishLog function - now uses async/await
async function publishLog(log) {
  if (!redisReady) {
    console.log('⏳ Waiting for Redis to be ready...');
    await new Promise(resolve => {
      if (redisReady) {
        resolve();
      } else {
        publisher.once('ready', resolve);
      }
    });
  }

  const channel = `logs:${PROJECT_ID}`;
  const message = JSON.stringify({ log });
  
  console.log(`📤 Publishing to ${channel}: ${log}`);
  
  try {
    const numSubscribers = await publisher.publish(channel, message);
    console.log(`✅ Published to ${numSubscribers} subscriber(s)`);
  } catch (err) {
    console.error('❌ Failed to publish:', err);
  }
}

async function init() {
  console.log('🚀 Executing script.js');
  console.log('📋 PROJECT_ID:', PROJECT_ID);
  
  // Wait for Redis to be ready before publishing
  try {
    await publisher.ping();
    console.log('✅ Redis PING successful');
  } catch (err) {
    console.error('❌ Redis PING failed:', err);
    process.exit(1);
  }

  await publishLog('🚀 Build started...');
  
  const outDirPath = path.join(__dirname, 'output');

  await publishLog('📦 Installing dependencies...');
  
  const p = exec(`npm install --legacy-peer-deps && npm run build`, {
    cwd: outDirPath,
  });

  p.stdout.on('data', async function (data) {
    const output = data.toString();
    console.log(output);
    await publishLog(output);
  });

  p.stderr.on('data', async function (data) {
    const output = data.toString();
    console.error(output);
    await publishLog(`⚠️ ${output}`);
  });

  p.on('close', async function (code) {
    if (code !== 0) {
      console.error(`❌ Build process exited with code ${code}`);
      await publishLog(`❌ Build failed with exit code ${code}`);
      await publisher.quit();
      process.exit(1);
    }

    console.log('✅ Build complete');
    await publishLog('✅ Build completed. Starting deployment...');

    // Try build → dist fallback
    let buildFolderPath = path.join(__dirname, 'output', 'build');

    if (!fs.existsSync(buildFolderPath)) {
      console.log("No 'build' folder found, checking 'dist'...");
      await publishLog("📂 No 'build' folder, using 'dist' folder");
      buildFolderPath = path.join(__dirname, 'output', 'dist');
    }

    if (!fs.existsSync(buildFolderPath)) {
      console.error("❌ Neither 'build' nor 'dist' folder found.");
      await publishLog("❌ Deployment failed: No build output found");
      await publisher.quit();
      process.exit(1);
    }

    const buildFolderContents = fs.readdirSync(buildFolderPath, { recursive: true });
    
    await publishLog(`📁 Found ${buildFolderContents.length} files to upload`);

    for (const file of buildFolderContents) {
      const filePath = path.join(buildFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("⬆️ Uploading", filePath);
      await publishLog(`⬆️ Uploading: ${file}`);
      
      try {
        const command = new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: `__outputs/${PROJECT_ID}/${file}`,
          Body: fs.createReadStream(filePath),
          ContentType: mime.lookup(filePath) || 'application/octet-stream',
        });

        await s3.send(command);
        console.log("✅ Uploaded", filePath);
        await publishLog(`✅ ${file}`);
      } catch (uploadErr) {
        console.error(`❌ Failed to upload ${file}:`, uploadErr);
        await publishLog(`❌ Upload failed: ${file}`);
      }
    }

    console.log("🎉 Deployment completed");
    await publishLog('🎉 Deployment completed successfully!');
    await publishLog(`🌐 Visit: http://${PROJECT_ID}.localhost:8000`);
    
    // Close Redis connection gracefully
    await publisher.quit();
    console.log('✅ Redis connection closed');
    process.exit(0);
  });
}

init();