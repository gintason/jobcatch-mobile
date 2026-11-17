import { API_URL } from "./config";
import { tokens } from "./tokens";

/** Error thrown for any non-2xx response; `data` is the parsed DRF body. */
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message = "Request failed") {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;
interface Options { params?: Params; body?: unknown; form?: FormData; auth?: boolean; signal?: AbortSignal }

const NO_REFRESH = ["/auth/token/refresh/", "/auth/login/", "/auth/register/", "/auth/verify-otp/", "/auth/password-reset", "/auth/google/"];
let refreshing: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) { onSessionExpired = fn; }

async function doRefresh(): Promise<string | null> {
  const refresh = tokens.refresh();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST", credentials: "omit", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("refresh failed");
    const data = await res.json();
    await tokens.set(data.access, data.refresh ?? refresh);
    return data.access as string;
  } catch {
    await tokens.clear();
    onSessionExpired?.();
    return null;
  }
}

function buildUrl(path: string, params?: Params) {
  const url = /^https?:/i.test(path) ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

async function send(method: string, path: string, opts: Options, retried = false): Promise<Response> {
  // X-JobCatch-Client tells the backend this is the app, so payment gateways
  // send the payer back into the app (not the website) after checkout.
  const headers: Record<string, string> = { Accept: "application/json", "X-JobCatch-Client": "mobile" };
  const access = tokens.access();
  if (opts.auth !== false && access) headers.Authorization = `Bearer ${access}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.body); }

  // credentials: "omit" — the mobile app authenticates with bearer tokens only, never cookies.
  const res = await fetch(buildUrl(path, opts.params), { method, headers, body, signal: opts.signal, credentials: "omit" });
  if (res.status === 401 && !retried && access && !NO_REFRESH.some((p) => path.includes(p))) {
    refreshing = refreshing ?? doRefresh();
    const fresh = await refreshing;
    refreshing = null;
    if (fresh) return send(method, path, opts, true);
  }
  return res;
}

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(method, path, opts);
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError(0, null, "No internet connection. Check your network and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params, signal?: AbortSignal) => request<T>("GET", path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(method: "POST" | "PATCH", path: string, form: FormData) => request<T>(method, path, { form }),
  /** Public endpoints that must not send a (possibly stale) token. */
  anon: <T>(path: string, body: unknown) => request<T>("POST", path, { body, auth: false }),
};

/** Human-friendly message from an API error (DRF `detail` or field errors). */
export function apiError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return err.message;
    const d = err.data;
    if (d && typeof d === "object") {
      const obj = d as Record<string, unknown>;
      if (typeof obj.detail === "string") return obj.detail;
      const msgs = Object.values(obj).flat().filter((v): v is string => typeof v === "string");
      if (msgs.length) return msgs.join(" ");
    }
    if (err.status >= 500) return "Our server had a problem. Please try again shortly.";
  }
  return fallback;
}

/** DRF list responses may be paginated ({results}) or plain arrays. */
export function results<T>(data: unknown): T[] {
  const d = data as { results?: T[] } | T[] | null;
  return Array.isArray(d) ? d : d?.results ?? [];
}

/** A file picked on the device, ready for multipart upload. */
export interface PickedFile { uri: string; name: string; type: string }
export function appendFile(form: FormData, key: string, f: PickedFile) {
  // React Native's FormData accepts {uri, name, type} objects.
  form.append(key, f as unknown as Blob);
}
