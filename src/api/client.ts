const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

interface CallParams {
  idToken: string;
  action: 'list' | 'add' | 'update' | 'delete' | 'home';
  tab?: string;
  id?: string;
  data?: Record<string, unknown>;
}

export async function apiCall<T>({ idToken, action, tab, id, data }: CallParams): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new ApiError(0, 'missing_config', 'VITE_APPS_SCRIPT_URL is not set');
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    // Apps Script web apps don't accept custom headers without preflight; pass
    // the token in the JSON body instead, and use text/plain to skip preflight.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ idToken, action, tab, id, data }),
  });
  const json = (await res.json()) as { data?: T; error?: string; message?: string };
  if (json.error) {
    throw new ApiError(res.status, json.error, json.message);
  }
  return json.data as T;
}
