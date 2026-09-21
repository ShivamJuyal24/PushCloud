import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github, LogOut, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useSession } from '../lib/useSession';

export default function SiteHeader() {
  const session = useSession();
  const navigate = useNavigate();

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/deploy` }
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-700/50 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow">
            <Rocket size={16} strokeWidth={2.5} />
          </div>
          <span className="font-mono text-sm font-medium tracking-tight text-ink-50">
            pushcloud
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {session === undefined ? null : session ? (
            <>
              <Link to="/deploy" className="font-mono text-xs text-ink-300 hover:text-ink-50">
                Deploy
              </Link>
              <Link to="/dashboard" className="font-mono text-xs text-ink-300 hover:text-ink-50">
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-xs text-ink-300 hover:text-ink-50"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </>
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
      </div>
    </header>
  );
}