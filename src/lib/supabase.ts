import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once both env vars are set — otherwise the app runs in demo mode. */
export const isPresenceConfigured = Boolean(url && anonKey);

/**
 * A single browser Supabase client, or null when unconfigured. We only use
 * Realtime Presence here — no database, no auth — so the anon key is all we need.
 */
export const supabase = isPresenceConfigured
  ? createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
