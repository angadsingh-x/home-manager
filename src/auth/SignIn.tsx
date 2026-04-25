import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from './useAuth';

export function SignIn() {
  const { setIdToken } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Home Manager</h1>
        <p className="text-muted-foreground mt-2 text-sm">Sign in with the household Google account.</p>
      </div>
      <GoogleLogin
        onSuccess={(cred) => {
          if (cred.credential) setIdToken(cred.credential);
        }}
        onError={() => {
          /* surfaced inline by the button itself */
        }}
        useOneTap
      />
    </div>
  );
}

export function NotAuthorized({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Not authorized</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        {email ? <><code>{email}</code> isn't on the allowlist.</> : 'This account is not on the allowlist.'} Ask the admin
        to add you to the <code>users</code> tab in the Sheet.
      </p>
      <button
        className="text-sm underline text-muted-foreground"
        onClick={onSignOut}
      >
        Sign out
      </button>
    </div>
  );
}
