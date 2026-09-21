const express = require('express');
const { exec } = require('child_process');
const { requireAuth } = require('../middleware/auth');
const { validateGitHubRepo } = require('../lib/github');
const prisma = require('../db/client');
const {
  findOrCreateProject,
  createDeployment,
  getDeployment,
  listProjects,
  listProjectDeployments
} = require('../services/deployments');

const router = express.Router();

// Returns the synced profile for whoever the bearer token belongs to — handy
// for the frontend to confirm sign-in worked and display a name/email.
router.get('/me', requireAuth, (req, res) => {
  res.json({ data: req.user });
});

router.post('/deployments', requireAuth, async (req, res) => {
  try {
    const { gitUrl } = req.body;

    if (!gitUrl) {
      return res.status(400).json({ error: 'gitUrl is required' });
    }

    const trimmedUrl = gitUrl.trim();

    const validation = await validateGitHubRepo(trimmedUrl);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const project = await findOrCreateProject({ userId: req.user.id, repositoryUrl: trimmedUrl });
    const deployment = await createDeployment({ projectId: project.id, gitUrl: trimmedUrl });

    console.log('═══════════════════════════════════════');
    console.log('🚀 Starting local build for deployment:', deployment.id, '(slug:', deployment.publicSlug + ')');
    console.log('📋 Git URL:', trimmedUrl);
    console.log('═══════════════════════════════════════');

    // PROJECT_ID stays the short public slug — it's what the build worker
    // uses for the Redis channel and the preview subdomain. The deployment's
    // real primary key (a UUID) is what the frontend/API use everywhere else.
    const dockerCommand = `docker run --rm \
-e GIT_REPOSITORY__URL="${trimmedUrl}" \
-e PROJECT_ID="${deployment.publicSlug}" \
-e BUCKET_NAME="${process.env.S3_BUCKET || 'vercel'}" \
-e REDIS_URL="${process.env.REDIS_URL}" \
-e AWS_REGION="${process.env.AWS_REGION || 'us-east-1'}" \
-e S3_ENDPOINT="${process.env.S3_ENDPOINT || 'http://host.docker.internal:9000'}" \
-e ACCESS_KEY="${process.env.S3_ACCESS_KEY || 'minioadmin'}" \
-e SECRET_KEY="${process.env.S3_SECRET_KEY || 'minioadmin'}" \
builder-image`;

    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker build failed to start:', error);
        return;
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    });

    console.log('✅ Docker container started');

    res.status(201).json({ data: { deployment, project } });
  } catch (err) {
    console.error('❌ Failed to create deployment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.get('/deployments/:id', requireAuth, async (req, res) => {
  try {
    const deployment = await getDeployment(req.params.id);

    if (!deployment || deployment.project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json({ data: deployment });
  } catch (err) {
    console.error('❌ Failed to fetch deployment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await listProjects(req.user.id);
    res.json({ data: projects });
  } catch (err) {
    console.error('❌ Failed to list projects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/projects/:projectId/deployments', requireAuth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });

    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const deployments = await listProjectDeployments(req.params.projectId);
    res.json({ data: deployments });
  } catch (err) {
    console.error('❌ Failed to list deployments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;