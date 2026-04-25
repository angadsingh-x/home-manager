import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const STORAGE_KEY = 'hm.idToken';

interface AuthState {
  idToken: string | null;
  email: string | null;
  name: string | null;
  setIdToken: (token: string | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface JwtPayload {
  email?: string;
  name?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function tokenIsValid(token: string): JwtPayload | null {
  const claims = decodeJwt(token);
  if (!claims || !claims.exp) return null;
  if (claims.exp * 1000 <= Date.now() + 30_000) return null;
  return claims;
}

function InnerProvider({ children }: { children: ReactNode }) {
  const [idToken, setIdTokenState] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && tokenIsValid(stored) ? stored : null;
  });

  const claims = useMemo(() => (idToken ? tokenIsValid(idToken) : null), [idToken]);

  const setIdToken = useCallback((token: string | null) => {
    if (token && tokenIsValid(token)) {
      localStorage.setItem(STORAGE_KEY, token);
      setIdTokenState(token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIdTokenState(null);
    }
  }, []);

  // Google ID tokens expire after ~1h. Force a re-prompt when that happens.
  useEffect(() => {
    if (!claims?.exp) return;
    const ms = claims.exp * 1000 - Date.now();
    if (ms <= 0) {
      setIdToken(null);
      return;
    }
    const t = setTimeout(() => setIdToken(null), ms);
    return () => clearTimeout(t);
  }, [claims, setIdToken]);

  const signOut = useCallback(() => {
    googleLogout();
    setIdToken(null);
  }, [setIdToken]);

  const value = useMemo<AuthState>(
    () => ({
      idToken,
      email: claims?.email ?? null,
      name: claims?.name ?? null,
      setIdToken,
      signOut,
    }),
    [idToken, claims, setIdToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!CLIENT_ID) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-sm">
        <div>
          <p className="font-semibold mb-2">Missing config</p>
          <p className="text-muted-foreground">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code> and reload.
          </p>
        </div>
      </div>
    );
  }
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <InnerProvider>{children}</InnerProvider>
    </GoogleOAuthProvider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
