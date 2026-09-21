import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import SiteHeader from '../components/SiteHeader';
import { apiFetch } from '../lib/api';

export default function Deploy() {
  const navigate = useNavigate();

  const [gitUrl, setGitUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleDeploy(e) {
    e.preventDefault();
    if (!gitUrl.trim()) return;

    setDeploying(true);
    setErrorMsg(null);

    try {
      const { data } = await apiFetch('/deployments', {
        method: 'POST',
        body: JSON.stringify({ gitUrl: gitUrl.trim() })
      });

      navigate(`/deployments/${data.deployment.id}`);
    } catch (err) {
      setErrorMsg(err.message);
      setDeploying(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <SiteHeader />

      <div className="relative mx-auto max-w-2xl px-6 pb-16 pt-20">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-ink-50">Deploy a repo</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-300">
            Paste a public GitHub repo URL, watch the build stream live, and get a public URL.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleDeploy} className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Github
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <Input
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="pl-9"
                disabled={deploying}
              />
            </div>
            <Button type="submit" disabled={deploying || !gitUrl.trim()} className="sm:w-32">
              {deploying ? 'Deploying…' : 'Deploy'}
            </Button>
          </form>

          {errorMsg && <p className="mt-3 font-mono text-xs text-err">{errorMsg}</p>}
        </Card>

        <p className="mt-4 text-center font-mono text-xs text-ink-500">
          Supports Vite, Create React App, and plain static HTML. Public repos only.
        </p>
      </div>
    </div>
  );
}