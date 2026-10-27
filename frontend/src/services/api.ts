import type {
  Analysis,
  Dashboard,
  Filters,
  Page,
  Resource,
  ResourceKey,
} from "../types";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");
export const SWAGGER_URL = `${new URL(API_URL).origin}/swagger/`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error(
      "No pudimos conectar con la API. Comprueba que el backend esté disponible y vuelve a intentar.",
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.message || `La solicitud falló (HTTP ${response.status}).`,
      response.status,
      data.fields || {},
    );
  return data as T;
}

export const api = {
  list: (kind: ResourceKey, filters: Filters = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<Page<Resource>>(`/${kind}/?${query}`, { signal });
  },
  all: async (
    kind: ResourceKey,
    filters: Filters = {},
    signal?: AbortSignal,
  ) => {
    const records: Resource[] = [];
    let page = 1;
    while (true) {
      const result = await api.list(
        kind,
        { ...filters, page, page_size: 100 },
        signal,
      );
      records.push(...result.results);
      if (records.length >= result.count || !result.results.length)
        return records;
      page += 1;
    }
  },
  get: (kind: ResourceKey, id: number, signal?: AbortSignal) =>
    request<Resource>(`/${kind}/${id}/`, { signal }),
  save: (kind: ResourceKey, body: Record<string, unknown>, id?: number) =>
    request<Resource>(`/${kind}/${id ? `${id}/` : ""}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(body),
    }),
  remove: (kind: ResourceKey, id: number) =>
    request<void>(`/${kind}/${id}/`, { method: "DELETE" }),
  dashboard: (signal?: AbortSignal) =>
    request<Dashboard>("/dashboard/", { signal }),
  analyze: (id: number) =>
    request<Analysis>(`/campanas/${id}/analisis/`, { method: "POST" }),
  latestAnalysis: (id: number, signal?: AbortSignal) =>
    request<Analysis | null>(`/campanas/${id}/ultimo-analisis/`, { signal }),
  analysis: (id: string, signal?: AbortSignal) =>
    request<Analysis>(`/analisis/${id}/`, { signal }),
};
