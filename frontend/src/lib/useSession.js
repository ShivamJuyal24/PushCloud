import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Returns:
//   undefined -> still checking for an existing session
//   null      -> checked, signed out
//   object    -> signed in (Supabase session)
export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}