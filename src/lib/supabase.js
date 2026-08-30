const env = import.meta.env || {};

export const supabaseUrl = env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[SprakLab] Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

if (!globalThis.supabase?.createClient) {
  throw new Error("[SprakLab] Supabase client library is not loaded.");
}

const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "spraklab";
  } catch {
    return "spraklab";
  }
})();

const authStorage = (() => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
})();

export const supabase = globalThis.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
    storageKey: `sb-${supabaseProjectRef}-auth-token`,
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

export async function syncAuthState() {
  await initializeAuth();
  if (!supabase?.auth) {
    setCurrentSession(null);
    return {
      session: null,
      user: null,
      accessToken: "",
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  setCurrentSession(data?.session || null);
  if (!currentSession) {
    return {
      session: null,
      user: null,
      accessToken: "",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    currentUser = currentSession?.user || currentUser || null;
    return {
      session: currentSession,
      user: currentUser,
      accessToken: currentSession?.access_token || "",
    };
  }

  currentUser = userData.user;
  return {
    session: currentSession,
    user: currentUser,
    accessToken: currentSession.access_token || "",
  };
}

export async function getAccessToken(options = {}) {
  const { timeoutMs = AUTH_READY_TIMEOUT_MS } = options;
  await initializeAuth();

  let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!sessionData?.session?.access_token && currentUser) {
    await waitForAuthUpdate(timeoutMs);
    const retry = await supabase.auth.getSession();
    if (retry.error) throw retry.error;
    sessionData = retry.data;
  }

  const session = sessionData?.session || null;
  setCurrentSession(session);
  if (!session?.access_token) return "";

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    currentUser = null;
    return "";
  }
  currentUser = userData.user;
  return session.access_token;
}
