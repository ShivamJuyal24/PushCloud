import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Card } from '../components/ui/card';
import { ExternalLink, CircleDot } from 'lucide-react';
import { apiFetch } from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9002';
const IN_PROGRESS_STATUSES = ['queued', 'building', 'uploading'];

export default function Deployment() {
  const { id } = useParams();
  const [deployment, setDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const logEndRef = useRef(null);

  // The API/Postgres record is the source of truth — this is what makes a
  // browser refresh still show the final state, url, and failure reason.
  const loadDeployment = useCallback(async () => {
    try {
      const { data } = await apiFetch(`/deployments/${id}`);
      setDeployment(data);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [id]);

  useEffect(() => {
    loadDeployment();
  }, [loadDeployment]);

  // Live log + status stream, only while the deployment is still in progress.
  useEffect(() => {
    if (!deployment?.publicSlug) return;
    if (!IN_PROGRESS_STATUSES.includes(deployment.status)) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('subscribe', `logs:${deployment.publicSlug}`);
      socket.emit('subscribe', `status:${deployment.publicSlug}`);
    });

    socket.on('message', (msg) => {
      let parsed = null;
      try {
        parsed = JSON.parse(msg);
      } catch {
        // Non-JSON messages (e.g. the "Joined ... channel" ack) are ignored.
      }

      if (parsed && typeof parsed.log === 'string') {
        setLogs((prev) => [...prev, { text: parsed.log, at: Date.now() }]);
      } else if (parsed && parsed.status) {
        // A lifecycle event landed — refetch so status/url/failure reason
        // come from the same persisted record everything else reads from.
        loadDeployment();
      }
    });

    return () => socket.disconnect();
  }, [deployment?.publicSlug, deployment?.status, loadDeployment]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14 text-center text-ink-300">
        <p className="text-err">{loadError}</p>
        <Link to="/" className="mt-4 inline-block text-brand-300 underline">
          Back home
        </Link>
      </div>
    );
  }

  if (!deployment) {
    return <div className="mx-auto max-w-2xl px-6 py-14 text-center text-ink-300">Loading deployment…</div>;
  }

  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-14">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/dashboard" className="font-mono text-sm text-ink-300 hover:text-ink-50">
          ← Dashboard
        </Link>
        <StatusPill status={deployment.status} />
      </div>

      <h1 className="mb-1 font-mono text-sm text-ink-400">{deployment.project?.name}</h1>
      <p className="mb-6 break-all font-mono text-xs text-ink-500">{deployment.gitUrl}</p>

      {deployment.publicUrl && (
        <a
          href={deployment.publicUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex items-center justify-between rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok transition-colors hover:bg-ok/15"
        >
          <span className="font-mono">{deployment.publicUrl}</span>
          <ExternalLink size={15} />
        </a>
      )}

      {deployment.status === 'failed' && deployment.failureReason && (
        <div className="mb-4 rounded-md border border-err/30 bg-err/10 px-4 py-3 text-sm text-err">
          {deployment.failureReason}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-2.5">
          <span className="font-mono text-xs text-ink-300">logs:{deployment.publicSlug}</span>
          {IN_PROGRESS_STATUSES.includes(deployment.status) && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-brand-300">
              <CircleDot size={11} className="animate-pulse" />
              {deployment.status}
            </span>
          )}
        </div>
        <div className="log-scroll h-80 overflow-y-auto px-4 py-3">
          {logs.length === 0 && (
            <p className="font-mono text-xs text-ink-500">
              {IN_PROGRESS_STATUSES.includes(deployment.status)
                ? 'Waiting for logs…'
                : 'No live logs for this session — this deployment already finished.'}
            </p>
          )}
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
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    queued: { label: 'queued', dot: 'bg-ink-400' },
    building: { label: 'building', dot: 'bg-brand-400 animate-pulse' },
    uploading: { label: 'uploading', dot: 'bg-brand-400 animate-pulse' },
    ready: { label: 'ready', dot: 'bg-ok' },
    failed: { label: 'failed', dot: 'bg-err' },
    cancelled: { label: 'cancelled', dot: 'bg-ink-400' }
  };
  const s = map[status] ?? map.queued;

  return (
    <div className="flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className="font-mono text-[11px] text-ink-300">{s.label}</span>
    </div>
  );
}