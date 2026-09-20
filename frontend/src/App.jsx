import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { Github, Rocket, ExternalLink, CircleDot, Loader2 } from 'lucide-react';

// ---- Backend endpoints ----
// Change these two if your servers run on different hosts/ports.
const API_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:9002';

// Status machine: idle -> deploying -> live | error
export default function App() {
  const [gitUrl, setGitUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [projectId, setProjectId] = useState(null);
  const [liveUrl, setLiveUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const socketRef = useRef(null);
  const logEndRef = useRef(null);

  // Autoscroll the log panel as new lines arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

  // Clean up the socket connection on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  function appendLog(line) {
    setLogs((prev) => [...prev, { text: line, at: Date.now() }]);
  }

  function connectToLogs(id) {
    // Fresh socket per deploy keeps this simple and avoids stale subscriptions.
    socketRef.current?.disconnect();

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      appendLog(`Connected to log stream`);
      socket.emit('subscribe', `logs:${id}`);
    });

    socket.on('message', (msg) => {
      appendLog(msg);
      // The builder's final line looks like: "🌐 Visit: http://<slug>.localhost:8000"
      const match = typeof msg === 'string' && msg.match(/https?:\/\/[^\s]+\.localhost:8000/);
      if (match) {
        setLiveUrl(match[0]);
        setStatus('live');
      }
    });

    socket.on('connect_error', (err) => {
      appendLog(`Socket connection error: ${err.message}`);
      setStatus('error');
      setErrorMsg('Could not connect to the log stream (check the socket server port).');
    });
  }

  async function handleDeploy(e) {
    e.preventDefault();
    if (!gitUrl.trim()) return;

    setStatus('deploying');
    setErrorMsg(null);
    setLogs([]);
    setLiveUrl(null);
    setProjectId(null);

    try {
      const res = await fetch(`${API_URL}/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitUrl: gitUrl.trim() })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      const id = data?.data?.projectId;

      if (!id) throw new Error('Response did not include a projectId.');

      setProjectId(id);
      appendLog(`Queued as ${id}`);
      connectToLogs(id);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500 text-ink-950">
              <Rocket size={16} strokeWidth={2.5} />
            </div>
            <span className="font-mono text-sm font-medium tracking-tight text-ink-50">
              pushcloud
            </span>
          </div>
          <StatusPill status={status} />
        </header>

        {/* Deploy form */}
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
                disabled={status === 'deploying'}
              />
            </div>
            <Button
              type="submit"
              disabled={status === 'deploying' || !gitUrl.trim()}
              className="sm:w-32"
            >
              {status === 'deploying' ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Deploying
                </>
              ) : (
                'Deploy'
              )}
            </Button>
          </form>

          {errorMsg && (
            <p className="mt-3 font-mono text-xs text-err">{errorMsg}</p>
          )}
        </Card>

        {/* Live URL banner */}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-between rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok transition-colors hover:bg-ok/15"
          >
            <span className="font-mono">{liveUrl}</span>
            <ExternalLink size={15} />
          </a>
        )}

        {/* Log panel */}
        {(logs.length > 0 || status !== 'idle') && (
          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2.5">
              <span className="font-mono text-xs text-ink-300">
                {projectId ? `logs:${projectId}` : 'logs'}
              </span>
              {status === 'deploying' && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-amber-400">
                  <CircleDot size={11} className="animate-pulse" />
                  building
                </span>
              )}
            </div>
            <div className="log-scroll h-80 overflow-y-auto px-4 py-3">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-ink-200"
                >
                  {log.text}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    idle: { label: 'idle', dot: 'bg-ink-400' },
    deploying: { label: 'deploying', dot: 'bg-amber-400 animate-pulse' },
    live: { label: 'live', dot: 'bg-ok' },
    error: { label: 'error', dot: 'bg-err' }
  };
  const s = map[status] ?? map.idle;

  return (
    <div className="flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className="font-mono text-[11px] text-ink-300">{s.label}</span>
    </div>
  );
}
