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

// Initialize S3 client. Defaults match local MinIO for dev; override via env
// vars (passed through by api-server's docker run command) for real S3 or a
// remote MinIO instance.
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://host.docker.internal:9000',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
});

const PROJECT_ID = process.env.PROJECT_ID; // this is the deployment's public slug
const outDirPath = path.join(__dirname, 'output');

async function waitForRedisReady() {
  if (redisReady) return;
  console.log('⏳ Waiting for Redis to be ready...');
  await new Promise((resolve) => {
    if (redisReady) resolve();
    else publisher.once('ready', resolve);
  });
}

// Raw build output, one line at a time — consumed by the frontend's live log panel.
async function publishLog(log) {
  await waitForRedisReady();

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

// Structured lifecycle event — the API server subscribes to status:* and
// writes these into the deployments table, so a page refresh (or a client
// that was never connected to the socket) still sees the real state.
async function publishStatus(status, extra = {}) {
  await waitForRedisReady();

  const channel = `status:${PROJECT_ID}`;
  const message = JSON.stringify({ status, ...extra });

  console.log(`📤 Publishing to ${channel}:`, message);

  try {
    await publisher.publish(channel, message);
  } catch (err) {
    console.error('❌ Failed to publish status:', err);
  }
}

/**
 * MVP framework detection. Checked in a fixed, explicit order so behavior is
 * predictable instead of silently guessing between build/dist forever:
 *   1. No package.json at all        -> static HTML, serve the repo root as-is
 *   2. package.json has "vite"       -> Vite project, expect ./dist after build
 *   3. package.json has "react-scripts" -> Create React App, expect ./build after build
 *   4. anything else                 -> unsupported for this MVP
 */
function detectProject() {
  const pkgPath = path.join(outDirPath, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return { type: 'static-html', outputPath: outDirPath, needsBuild: false };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    return { type: 'unsupported', error: `Could not parse package.json: ${err.message}` };
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  if (deps.vite) {
    return { type: 'vite', outputPath: path.join(outDirPath, 'dist'), needsBuild: true };
  }

  if (deps['react-scripts']) {
    return { type: 'create-react-app', outputPath: path.join(outDirPath, 'build'), needsBuild: true };
  }

  return {
    type: 'unsupported',
    error:
      'Detected a package.json but no supported framework (Vite or Create React App). ' +
      'This MVP only supports Vite, Create React App, and plain static HTML sites.'
  };
}

async function uploadFolder(folderPath) {
  const contents = fs.readdirSync(folderPath, { recursive: true });

  await publishLog(`📁 Found ${contents.length} files to upload`);

  for (const file of contents) {
    const filePath = path.join(folderPath, file);
    if (fs.lstatSync(filePath).isDirectory()) continue;

    console.log('⬆️ Uploading', filePath);
    await publishLog(`⬆️ Uploading: ${file}`);

    try {
      const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || 'application/octet-stream',
      });

      await s3.send(command);
      console.log('✅ Uploaded', filePath);
      await publishLog(`✅ ${file}`);
    } catch (uploadErr) {
      console.error(`❌ Failed to upload ${file}:`, uploadErr);
      await publishLog(`❌ Upload failed: ${file}`);
    }
  }
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const p = exec(`npm install --legacy-peer-deps && npm run build`, {
      cwd: outDirPath,
    });

    p.stdout.on('data', async (data) => {
      const output = data.toString();
      console.log(output);
      await publishLog(output);
    });

    p.stderr.on('data', async (data) => {
      const output = data.toString();
      console.error(output);
      await publishLog(`⚠️ ${output}`);
    });

    p.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Build process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function fail(message) {
  console.error(`❌ ${message}`);
  await publishLog(`❌ ${message}`);
  await publishStatus('failed', { failureReason: message });
  await publisher.quit();
  process.exit(1);
}

async function init() {
  console.log('🚀 Executing script.js');
  console.log('📋 PROJECT_ID:', PROJECT_ID);

  try {
    await publisher.ping();
    console.log('✅ Redis PING successful');
  } catch (err) {
    console.error('❌ Redis PING failed:', err);
    process.exit(1);
  }

  await publishLog('🚀 Build started...');

  const project = detectProject();

  if (project.type === 'unsupported') {
    await fail(project.error);
    return;
  }

  await publishLog(`🔍 Detected project type: ${project.type}`);
  await publishStatus('building');

  if (project.needsBuild) {
    await publishLog('📦 Installing dependencies and building...');
    try {
      await runBuild();
    } catch (err) {
      await fail(`Build failed: ${err.message}`);
      return;
    }
  } else {
    await publishLog('📄 No build step needed — deploying static HTML as-is');
  }

  console.log('✅ Build complete');
  await publishLog('✅ Build completed. Starting deployment...');

  if (!fs.existsSync(project.outputPath)) {
    await fail(
      `Expected output folder not found at ${path.relative(outDirPath, project.outputPath) || '.'} ` +
      `for a ${project.type} project. Deployment failed.`
    );
    return;
  }

  await publishLog(`📂 Using output folder: ${path.relative(outDirPath, project.outputPath) || '(repo root)'}`);
  await publishStatus('uploading');

  await uploadFolder(project.outputPath);

  const publicUrl = `http://${PROJECT_ID}.localhost:8000`;

  console.log('🎉 Deployment completed');
  await publishLog('🎉 Deployment completed successfully!');
  await publishLog(`🌐 Visit: ${publicUrl}`);
  await publishStatus('ready', { publicUrl });

  await publisher.quit();
  console.log('✅ Redis connection closed');
  process.exit(0);
}

init();