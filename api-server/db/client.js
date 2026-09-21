const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient across hot reloads / multiple requires instead
// of opening a new connection pool every time this module is imported.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;