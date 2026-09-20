require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { generateSlug } = require('random-word-slugs');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { exec } = require('child_process');

const PORT = 5000;
const app = express();

const subscriber = new Redis(process.env.REDIS_URL);

// Fixed: cors must be an object, not a string
const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.listen(9002, () => {
  console.log('WebSocket Server running → http://localhost:9002');
});

io.on('connection', (socket) => {
  socket.on('subscribe', (channel) => {
    socket.join(channel);
    socket.emit('message', `Joined ${channel} channel`);
  });
});

// Added: CORS for the Express API itself — must come before routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.post('/project', async (req, res) => {
  try {
    const { gitUrl } = req.body;

    if (!gitUrl) {
      return res.status(400).json({ error: 'gitUrl is required' });
    }

    const projectSlug = generateSlug();

    console.log('═══════════════════════════════════════');
    console.log('🚀 Starting local build for project:', projectSlug);
    console.log('📋 Git URL:', gitUrl);
    console.log(
      '📋 Redis URL:',
      process.env.REDIS_URL
        ? `✅ Set (length: ${process.env.REDIS_URL.length})`
        : '❌ Missing'
    );
    console.log('═══════════════════════════════════════');

    const dockerCommand = `docker run --rm \
-e GIT_REPOSITORY__URL="${gitUrl}" \
-e PROJECT_ID="${projectSlug}" \
-e BUCKET_NAME="vercel" \
-e REDIS_URL="${process.env.REDIS_URL}" \
builder-image`;

    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker build failed:', error);
        return;
      }

      if (stdout) {
        console.log(stdout);
      }

      if (stderr) {
        console.error(stderr);
      }
    });

    console.log('✅ Docker container started');

    res.json({
      status: 'queued',
      data: {
        projectId: projectSlug,
        url: `http://${projectSlug}.localhost:8000`
      }
    });
  } catch (err) {
    console.error('❌ Build failed to start:', err);

    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

async function initRedisSubscriber() {
  console.log('Initializing Redis subscriber...');

  await subscriber.psubscribe('logs:*');

  subscriber.on('pmessage', (pattern, channel, message) => {
    io.to(channel).emit('message', message);
  });
}

initRedisSubscriber();

app.listen(PORT, () => {
  console.log(`API Server running → http://localhost:${PORT}`);
});