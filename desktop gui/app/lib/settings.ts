const BASE_KEY = "g2a_base_url";
const API_KEY = "g2a_api_key";
const ADMIN_KEY = "g2a_admin_key";

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function loadSettings(): {
  baseUrl: string;
  apiKey: string;
  adminKey: string;
} {
  if (typeof window === "undefined") {
    return { baseUrl: "http://localhost:8000", apiKey: "", adminKey: "" };
  }
  return {
    baseUrl: normalizeBaseUrl(
      localStorage.getItem(BASE_KEY) || "http://localhost:8000",
    ),
    apiKey: localStorage.getItem(API_KEY) || "",
    adminKey: localStorage.getItem(ADMIN_KEY) || "",
  };
}

export function saveSettings(partial: {
  baseUrl?: string;
  apiKey?: string;
  adminKey?: string;
}): void {
  if (typeof window === "undefined") return;
  if (partial.baseUrl !== undefined) {
    localStorage.setItem(BASE_KEY, normalizeBaseUrl(partial.baseUrl));
  }
  if (partial.apiKey !== undefined) {
    localStorage.setItem(API_KEY, partial.apiKey);
  }
  if (partial.adminKey !== undefined) {
    localStorage.setItem(ADMIN_KEY, partial.adminKey);
  }
}
