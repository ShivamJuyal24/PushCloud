import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Rocket, Radio, Link2, GitBranch } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import TerminalPreview from '../components/TerminalPreview';
import { supabase } from '../lib/supabaseClient';
import { useSession } from '../lib/useSession';

const FEATURES = [
  {
    icon: Radio,
    title: 'Live build logs',
    description:
      'Watch every step of your build stream over a websocket connection, from clone to live URL.'
  },
  {
    icon: GitBranch,
    title: 'Framework auto-detect',
    description:
      'Vite, Create React App, and plain static HTML are detected automatically — no config file needed.'
  },
  {
    icon: Link2,
    title: 'Instant public URL',
    description: 'Every successful deploy gets a public URL the moment the build finishes.'
  }
];

export default function Landing() {
  const session = useSession();

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/deploy` }
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-[-6rem] h-64 w-64 rounded-full bg-cyan-400/10 blur-[110px]" />

      <SiteHeader />

      <main className="relative mx-auto max-w-3xl px-6 pb-24 pt-16">
        <div className="mb-10 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-brand-300">
            <span className="h-1 w-1 rounded-full bg-brand-400" />
            deploy supported static GitHub projects
          </p>
          <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            Ship your repos{' '}
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
              in seconds
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            Paste a public GitHub repo URL, watch the build stream live, and get a public URL.
          </p>

          {session ? (
            <Link
              to="/deploy"
              className="mx-auto mt-7 flex w-fit items-center gap-2 rounded-md bg-brand-500 px-5 py-2.5 font-mono text-sm text-white shadow-glow transition-colors hover:bg-brand-600"
            >
              <Rocket size={15} />
              Deploy a repo
            </Link>
          ) : (
            <button
              onClick={handleSignIn}
              className="mx-auto mt-7 flex items-center gap-2 rounded-md bg-brand-500 px-5 py-2.5 font-mono text-sm text-white shadow-glow transition-colors hover:bg-brand-600"
            >
              <Github size={15} />
              Sign in with GitHub
            </button>
          )}
        </div>

        <TerminalPreview />

        <section className="mt-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-md border border-ink-700 bg-white/[0.03] p-5">
                <Icon size={18} className="mb-3 text-brand-300" />
                <h3 className="mb-1.5 font-mono text-sm text-ink-50">{title}</h3>
                <p className="text-xs leading-relaxed text-ink-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-ink-700/50 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-mono text-xs text-ink-500">pushcloud</span>
          <div className="flex items-center gap-5 font-mono text-xs text-ink-400">
            <a
              href="https://github.com/yourusername"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-50"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/yourusername"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-50"
            >
              LinkedIn
            </a>
            <a href="mailto:you@example.com" className="hover:text-ink-50">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}