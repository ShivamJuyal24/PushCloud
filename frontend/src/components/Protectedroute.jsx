import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../lib/useSession';

export default function ProtectedRoute({ children }) {
  const session = useSession();
  const location = useLocation();

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <p className="font-mono text-xs text-ink-400">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}