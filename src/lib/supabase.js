const env = import.meta.env || {};

export const supabaseUrl = env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[Min Ordbok] Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

if (!globalThis.supabase?.createClient) {
  throw new Error("[Min Ordbok] Supabase client library is not loaded.");
}

export const supabase = globalThis.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const AUTH_READY_TIMEOUT_MS = 5000;

let authInitPromise = null;
let currentSession = null;
let currentUser = null;
const authWaiters = new Set();

function setCurrentSession(session) {
  currentSession = session || null;
  currentUser = session?.user || null;
  authWaiters.forEach((resolve) => resolve());
  authWaiters.clear();
}

function waitForAuthUpdate(timeoutMs = AUTH_READY_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      authWaiters.delete(done);
      resolve();
    }, timeoutMs);
    function done() {
      clearTimeout(timeoutId);
      resolve();
    }
    authWaiters.add(done);
  });
}

export function initializeAuth() {
  if (authInitPromise) return authInitPromise;
  if (!supabase?.auth) {
    authInitPromise = Promise.resolve(null);
    return authInitPromise;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentSession(session);
  });

  authInitPromise = supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      setCurrentSession(data?.session || null);
      return currentSession;
    });

  return authInitPromise;
}

export async function getAuthState({ waitForAccessToken = false, timeoutMs = AUTH_READY_TIMEOUT_MS } = {}) {
  await initializeAuth();
  if (waitForAccessToken && currentUser && !currentSession?.access_token) {
    await waitForAuthUpdate(timeoutMs);
  }
  return {
    session: currentSession,
    user: currentUser,
    accessToken: currentSession?.access_token || "",
  };
}

export async function getCurrentUser({ refresh = false } = {}) {
  await initializeAuth();
  if (currentUser && !refresh) return currentUser;
  const { data, error } = await supabase.auth.getUser();
  if (error) return currentUser || null;
  currentUser = data?.user || currentUser || null;
  return currentUser;
}

export async function getAccessToken(options = {}) {
  const { accessToken } = await getAuthState({ ...options, waitForAccessToken: true });
  return accessToken || "";
}
