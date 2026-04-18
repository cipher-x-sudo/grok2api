import { loadSettings, normalizeBaseUrl } from "./settings";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function formatDetail(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "object" && body !== null && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((x) =>
          typeof x === "object" && x && "msg" in x ? String((x as { msg: unknown }).msg) : String(x),
        )
        .join("; ");
    }
    if (typeof d === "object" && d !== null && "message" in d) {
      return String((d as { message: unknown }).message);
    }
  }
  if (typeof body === "object" && body !== null && "error" in body) {
    const e = (body as { error: { message?: string } }).error;
    if (e?.message) return e.message;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json().catch(() => ({}));
  }
  return res.text().catch(() => "");
}

export async function openAiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl, apiKey } = loadSettings();
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await parseBody(res);
    throw new ApiError(formatDetail(body) || res.statusText, res.status, body);
  }
  return res;
}

export async function openAiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const res = await openAiFetch(path, { ...init, headers });
  return res.json() as Promise<T>;
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl, adminKey } = loadSettings();
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!adminKey) {
    throw new ApiError("Admin API key is not configured (API Setup tab).", 401, null);
  }
  headers.set("Authorization", `Bearer ${adminKey}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await parseBody(res);
    throw new ApiError(formatDetail(body) || res.statusText, res.status, body);
  }
  return res;
}

export async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const res = await adminFetch(path, { ...init, headers });
  return res.json() as Promise<T>;
}

export async function openAiBlob(path: string): Promise<Blob> {
  const res = await openAiFetch(path, { method: "GET" });
  return res.blob();
}

/** Raw fetch for streaming; caller checks res.ok and reads body. */
export async function openAiFetchRaw(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { baseUrl, apiKey } = loadSettings();
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  return fetch(url, { ...init, headers });
}
