import { useQuery } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { NotAuthorized, SignIn } from './auth/SignIn';
import { BottomNav } from './components/BottomNav';
import { apiCall, ApiError } from './api/client';
import { HomeTab } from './tabs/Home';
import { LeavesTab } from './tabs/Leaves';
import { ShoppingTab } from './tabs/Shopping';
import { CalendarTab } from './tabs/Calendar';
import { ThingsTab } from './tabs/Things';

function AuthorizedShell() {
  const { idToken, email, signOut } = useAuth();

  // Cheap "am I allowed?" probe — Home view returns 403 if email is not allowlisted.
  const probe = useQuery({
    queryKey: ['probe', email],
    enabled: !!idToken,
    retry: false,
    staleTime: 60_000,
    queryFn: () => apiCall<unknown>({ idToken: idToken!, action: 'home' }),
  });

  if (probe.isLoading) {
    return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (probe.error instanceof ApiError && probe.error.code === 'not_authorized') {
    return <NotAuthorized email={email} onSignOut={signOut} />;
  }
  if (probe.error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-destructive">Couldn't reach the backend.</p>
        <p className="text-xs text-muted-foreground max-w-sm">{(probe.error as Error).message}</p>
        <button className="text-sm underline" onClick={() => probe.refetch()}>Retry</button>
        <button className="text-xs underline text-muted-foreground" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-20">
      <Routes>
        <Route path="/" element={<HomeTab />} />
        <Route path="/leaves" element={<LeavesTab />} />
        <Route path="/shopping" element={<ShoppingTab />} />
        <Route path="/calendar" element={<CalendarTab />} />
        <Route path="/things" element={<ThingsTab />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const { idToken } = useAuth();
  if (!idToken) return <SignIn />;
  return <AuthorizedShell />;
}
