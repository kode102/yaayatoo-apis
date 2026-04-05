import {getRuntimeConfig} from "@/lib/runtime-config";

export type ApiListResponse<T> = {success: boolean; data?: T[]; error?: string};
export type ApiDocResponse<T> = {success: boolean; data?: T; error?: string};
export type ApiOkResponse = {success: boolean; error?: string};

async function apiBase(): Promise<string> {
  const {yaayatooApiBase} = await getRuntimeConfig();
  return yaayatooApiBase.replace(/\/$/, "");
}

export async function adminFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const base = await apiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...init.headers,
  };
  const res = await fetch(url, {...init, headers});
  const json = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    success?: boolean;
  };
  if (!res.ok) {
    throw new Error(
      typeof json.error === "string" ? json.error : `HTTP ${res.status}`,
    );
  }
  return json as T;
}
