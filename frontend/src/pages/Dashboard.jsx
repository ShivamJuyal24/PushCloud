import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';

export default function Dashboard() {
  const session = useSession();
  const [projects, setProjects] = useState(null);
  const [deploymentsByProject, setDeploymentsByProject] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;

    async function load() {
      try {
        const { data: projectList } = await apiFetch('/projects');
        setProjects(projectList);

        const entries = await Promise.all(
          projectList.map(async (p) => {
            const { data } = await apiFetch(`/projects/${p.id}/deployments`);
            return [p.id, data];
          })
        );
        setDeploymentsByProject(Object.fromEntries(entries));
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, [session]);

  if (session === undefined) {
    return <div className="mx-auto max-w-3xl px-6 py-14 text-center text-ink-300">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14 text-center text-ink-300">
        <p>Sign in to see your projects.</p>
        <Link to="/" className="mt-4 inline-block text-brand-300 underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-14">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-mono text-lg text-ink-50">Your projects</h1>
        <Link to="/" className="font-mono text-sm text-brand-300 underline">
          New deployment
        </Link>
      </div>

      {error && <p className="mb-4 font-mono text-xs text-err">{error}</p>}

      {projects?.length === 0 && (
        <p className="font-mono text-sm text-ink-400">
          No projects yet — deploy your first repo from the home page.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {projects?.map((project) => (
          <Card key={project.id} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-ink-50">{project.name}</span>
              <span className="truncate font-mono text-xs text-ink-500">{project.repositoryUrl}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {(deploymentsByProject[project.id] || []).slice(0, 5).map((d) => (
                <Link
                  key={d.id}
                  to={`/deployments/${d.id}`}
                  className="flex items-center justify-between rounded-md border border-ink-700/70 px-3 py-2 font-mono text-xs text-ink-300 hover:border-brand-400/50"
                >
                  <span>{new Date(d.createdAt).toLocaleString()}</span>
                  <StatusBadge status={d.status} />
                </Link>
              ))}
              {(deploymentsByProject[project.id] || []).length === 0 && (
                <span className="font-mono text-xs text-ink-500">No deployments yet</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color =
    {
      queued: 'text-ink-400',
      building: 'text-brand-300',
      uploading: 'text-brand-300',
      ready: 'text-ok',
      failed: 'text-err',
      cancelled: 'text-ink-400'
    }[status] || 'text-ink-400';

  return <span className={color}>{status}</span>;
}