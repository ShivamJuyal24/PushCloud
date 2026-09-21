import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { Github, Rocket, LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { useSession } from './lib/useSession';
import { apiFetch } from './lib/api';

export default function App() {
  const session = useSession();
  const navigate = useNavigate();

  const [gitUrl, setGitUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin }
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleDeploy(e) {
    e.preventDefault();
    if (!gitUrl.trim() || !session) return;

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layers: grid + glow blobs */}
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-[-6rem] h-64 w-64 rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-14">
        {/* Header */}
        <header className="mb-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow">
              <Rocket size={16} strokeWidth={2.5} />
            </div>
            <span className="font-mono text-sm font-medium tracking-tight text-ink-50">
              pushcloud
            </span>
          </div>

          <div className="flex items-center gap-3">
            {session && (
              <Link to="/dashboard" className="font-mono text-xs text-ink-300 hover:text-ink-50">
                Dashboard
              </Link>
            )}
            {session === undefined ? null : session ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-xs text-ink-300 hover:text-ink-50"
              >
                <LogOut size={13} />
                Sign out
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 font-mono text-xs text-ink-200 hover:border-brand-400/50"
              >
                <Github size={13} />
                Sign in with GitHub
              </button>
            )}
          </div>
        </header>

        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-brand-300">
            <span className="h-1 w-1 rounded-full bg-brand-400" />
            deploy supported static GitHub projects
          </p>
          <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            Ship your repos{' '}
            <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              in seconds
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            Paste a public GitHub repo URL, watch the build stream live, and get a public URL.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-400">
            Supports Vite, Create React App, and plain static HTML. Public repos only — no
            private repos, custom domains, or server-side rendering yet.
          </p>
        </div>

        {/* Deploy form */}
        <Card className="p-6">
          {session ? (
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
          ) : session === undefined ? (
            <p className="text-center font-mono text-xs text-ink-400">Loading…</p>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <p className="font-mono text-xs text-ink-400">Sign in with GitHub to deploy a project.</p>
              <Button onClick={handleSignIn} className="w-fit">
                <Github size={14} />
                Sign in with GitHub
              </Button>
            </div>
          )}

          {errorMsg && <p className="mt-3 font-mono text-xs text-err">{errorMsg}</p>}
        </Card>
      </div>
    </div>
  );
}