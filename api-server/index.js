require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const projectsRouter = require('./routes/projects');
const { updateStatusBySlug } = require('./services/deployments');

const PORT = process.env.PORT || 5000;
const app = express();

const subscriber = new Redis(process.env.REDIS_URL);

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

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(projectsRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

async function initRedisSubscriber() {
  console.log('Initializing Redis subscriber...');

  // logs:<slug>   -> raw build output, forwarded straight to the browser
  // status:<slug> -> structured lifecycle events from build-server, persisted
  //                  to Postgres so a page refresh still shows the truth
  await subscriber.psubscribe('logs:*', 'status:*');

  subscriber.on('pmessage', async (pattern, channel, message) => {
    // Forward everything to any live socket.io listeners on this channel —
    // the frontend can react instantly while a build is in progress.
    io.to(channel).emit('message', message);

    if (pattern !== 'status:*') return;

    const publicSlug = channel.slice('status:'.length);

    let payload;
    try {
      payload = JSON.parse(message);
    } catch (err) {
      console.error('❌ Could not parse status message on', channel, ':', message);
      return;
    }

    try {
      await updateStatusBySlug(publicSlug, payload);
      console.log(`📝 Deployment ${publicSlug} status → ${payload.status}`);
    } catch (err) {
      console.error(`❌ Failed to persist status for ${publicSlug}:`, err);
    }
  });
}

initRedisSubscriber();

app.listen(PORT, () => {
  console.log(`API Server running → http://localhost:${PORT}`);
});