const jwt = require('jsonwebtoken');
const prisma = require('../db/client');

// 'jose' is ESM-only; loaded lazily via dynamic import from this CommonJS file.
let jose;
let remoteJWKS;

/**
 * Verifies a Supabase-issued access token regardless of how the project is
 * currently signing it:
 *   - HS256  -> legacy shared secret (SUPABASE_JWT_SECRET), verified locally
 *   - RS256/ES256 -> new asymmetric signing keys, verified against the
 *                    project's published JWKS (no shared secret needed)
 *
 * This means a Supabase dashboard "rotate to standby key" action doesn't
 * require a code change here — whichever algorithm a given token was signed
 * with, this picks the matching verification path.
 */
async function verifySupabaseToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Malformed token');
  }

  const alg = decoded.header.alg;

  if (alg === 'HS256') {
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error('SUPABASE_JWT_SECRET is not set, but this token is HS256-signed.');
    }
    return jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
  }

  // Asymmetric algorithms (ES256, RS256, ...) — verify against the JWKS
  // endpoint instead of a shared secret.
  if (!jose) {
    jose = await import('jose');
  }

  if (!remoteJWKS) {
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL is required to verify asymmetric-signed Supabase tokens.');
    }
    remoteJWKS = jose.createRemoteJWKSet(
      new URL(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`)
    );
  }

  const { payload } = await jose.jwtVerify(token, remoteJWKS);
  return payload;
}

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <token>`,
 * upserts a matching row in our own `users` table (identity itself lives in
 * Supabase Auth), and attaches it to req.user.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <token> header. Sign in first.' });
  }

  let payload;
  try {
    payload = await verifySupabaseToken(token);
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const supabaseUserId = payload.sub;
  const email = payload.email || null;
  const meta = payload.user_metadata || {};
  const githubId = meta.provider_id || meta.sub || null;
  const name = meta.full_name || meta.user_name || meta.name || null;

  try {
    const user = await prisma.user.upsert({
      where: { supabaseUserId },
      update: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {})
      },
      create: { supabaseUserId, email, name, githubId }
    });

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Failed to sync user record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireAuth };