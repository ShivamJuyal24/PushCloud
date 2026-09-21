const prisma = require('../db/client');
const { generateSlug } = require('random-word-slugs');

async function findOrCreateProject({ userId, repositoryUrl }) {
  let project = await prisma.project.findUnique({
    where: { userId_repositoryUrl: { userId, repositoryUrl } }
  });

  if (!project) {
    const name = repositoryUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    project = await prisma.project.create({ data: { userId, repositoryUrl, name } });
  }

  return project;
}

async function createDeployment({ projectId, gitUrl }) {
  const publicSlug = generateSlug();

  return prisma.deployment.create({
    data: {
      projectId,
      gitUrl,
      publicSlug,
      status: 'queued'
    }
  });
}

async function getDeployment(id) {
  return prisma.deployment.findUnique({
    where: { id },
    include: { project: true }
  });
}

async function listProjects(userId) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

async function listProjectDeployments(projectId) {
  return prisma.deployment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Called from the Redis `status:<publicSlug>` subscriber as the build worker
 * progresses, so a browser refresh always reflects the persisted state.
 */
async function updateStatusBySlug(publicSlug, { status, publicUrl, failureReason }) {
  const data = {};

  if (status) data.status = status;
  if (status === 'building') data.buildStartedAt = new Date();
  if (status === 'ready' || status === 'failed' || status === 'cancelled') {
    data.buildFinishedAt = new Date();
  }
  if (publicUrl) data.publicUrl = publicUrl;
  if (failureReason) data.failureReason = failureReason;

  return prisma.deployment.update({ where: { publicSlug }, data });
}

module.exports = {
  findOrCreateProject,
  createDeployment,
  getDeployment,
  listProjects,
  listProjectDeployments,
  updateStatusBySlug
};