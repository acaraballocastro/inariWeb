export class ApiError extends Error {
  status: number;
  /** Stable backend error code, e.g. "RESERVATION_NOT_FOUND". */
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9142/api/v1").replace(/\/$/, "");
const sessionStorageKey = "inari.session";

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  code?: string;
};

export type Session = {
  userId: string;
  role: string;
  mustChangePassword: boolean;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  const storedSession = window.localStorage.getItem(sessionStorageKey);
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession) as Session;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  window.dispatchEvent(new Event(sessionChangeEvent));
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey);
  window.dispatchEvent(new Event(sessionChangeEvent));
}

/** Fired on this tab when the session changes ("storage" only fires on the other tabs). */
export const sessionChangeEvent = "inari:session";

/** The stored session as text, for useSyncExternalStore (a stable snapshot). */
export function readStoredSession() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(sessionStorageKey);
}

export function isAdmin(session: Session | null) {
  return session?.role === "ADMIN";
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await send<T>(path, options)).data;
}

/** One page of a listing and how many rows match in total. */
export type Page<T> = { items: T[]; total: number };

/** Appends `limit` and `offset` to a listing path; the total comes in X-Total-Count. */
export async function requestPage<T>(path: string, page: { limit: number; offset: number }, options: RequestInit = {}): Promise<Page<T>> {
  const separator = path.includes("?") ? "&" : "?";
  const { data, response } = await send<T[] | null>(`${path}${separator}limit=${page.limit}&offset=${page.offset}`, options);
  const items = data ?? [];
  const total = response.headers.get("X-Total-Count");
  return { items, total: total === null ? page.offset + items.length : Number(total) };
}

/** Uploads a FormData (multipart; the browser sets its boundary). */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  return (await send<T>(path, { method: "POST", body: form })).data;
}

/** Downloads a file with the session (images and PDFs of the API). */
export async function requestBlob(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { credentials: "include" });
  } catch {
    throw new ApiError("Could not connect to the server.", 0);
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") clearSession();
    throw new ApiError(response.status === 404 ? "The file is no longer available." : "Could not download the file.", response.status);
  }
  return response.blob();
}

async function send<T>(path: string, options: RequestInit): Promise<{ data: T; response: Response }> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError("Could not connect to the server.", 0);
  }

  const bodyText = await response.text();
  let body: unknown = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
    }
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : typeof body === "string" && body
        ? body
        : "The operation could not be completed.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : undefined;
    // A user still on the temporary password may only change it.
    if (code === "PASSWORD_CHANGE_REQUIRED" && typeof window !== "undefined") {
      const session = getSession();
      if (session) saveSession({ ...session, mustChangePassword: true });
      // request() runs outside components, with no router: a full navigation is intended.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (window.location.pathname !== "/change-password") window.location.assign("/change-password");
    }
    throw new ApiError(message, response.status, code);
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return { data: (body as ApiEnvelope<T>).data as T, response };
  }

  return { data: body as T, response };
}

export { apiUrl };
