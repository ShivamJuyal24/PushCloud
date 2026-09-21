// ---- MVP scope guard ----
// We only support public GitHub repositories for now. See docs/mvp-scope.md.
const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

/**
 * Parses a GitHub URL and confirms the repository exists and is public.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function validateGitHubRepo(gitUrl) {
  const match = gitUrl.match(GITHUB_URL_PATTERN);

  if (!match) {
    return {
      ok: false,
      error:
        'Only public GitHub repository URLs are supported right now, e.g. ' +
        'https://github.com/user/repo. GitLab, Bitbucket, and private repos are not supported yet.'
    };
  }

  const [, owner, repo] = match;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'pushcloud-mvp' }
    });

    if (res.status === 404) {
      return {
        ok: false,
        error: `Repository ${owner}/${repo} was not found, or it's private. Only public repositories are supported right now.`
      };
    }

    if (!res.ok) {
      // GitHub API had an issue (rate limit, outage, etc). Don't hard-block the
      // deploy on this — the build step will surface a clearer error if the repo
      // truly can't be cloned.
      console.warn(`⚠️ GitHub API check returned ${res.status} for ${owner}/${repo}, proceeding anyway`);
      return { ok: true };
    }

    const data = await res.json();

    if (data.private) {
      return {
        ok: false,
        error: `Repository ${owner}/${repo} is private. Only public repositories are supported right now.`
      };
    }

    return { ok: true };
  } catch (err) {
    console.warn('⚠️ Could not reach GitHub API to validate repo, proceeding anyway:', err.message);
    return { ok: true };
  }
}

module.exports = { validateGitHubRepo, GITHUB_URL_PATTERN };