import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL + "api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || err.message || "Request failed");
  }
  return res.json();
}

export interface Proxy {
  id: string;
  name: string;
  country: string;
  countryName: string;
  city: string | null;
  externalPort: number;
  status: string;
  containerId: string | null;
  publicIp: string | null;
  allowedIps: string[] | null;
  rotationInterval: number;
  rotationNextAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastCountryChangeAt: string | null;
}

export const PROXIES_QUERY_KEY = ["proxies"];

export function useGetProxies() {
  return useQuery({
    queryKey: PROXIES_QUERY_KEY,
    queryFn: () => apiFetch<Proxy[]>("/proxies"),
    refetchInterval: 10000,
  });
}

export function useCreateProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; nordUser: string; nordPass: string; country: string; city?: string }) =>
      apiFetch<Proxy>("/proxies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useStartProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<Proxy>(`/proxies/${id}/restart`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useStopProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<Proxy>(`/proxies/${id}/stop`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useRestartProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<Proxy>(`/proxies/${id}/restart`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useDeleteProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch(`/proxies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useChangeCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { country: string; city?: string } }) =>
      apiFetch<Proxy>(`/proxies/${id}/country`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useSetRotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rotationInterval }: { id: string; rotationInterval: number }) =>
      apiFetch<Proxy>(`/proxies/${id}/rotation`, { method: "PATCH", body: JSON.stringify({ rotationInterval }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useGetConnectionString(proxyId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["connectionString", proxyId],
    queryFn: () => apiFetch<{ proxyString: string; ip: string; port: number; nordUser: string }>(`/proxies/${proxyId}/connection`),
    enabled: options?.enabled ?? true,
  });
}

export function useGetProxyLogs(proxyId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["proxyLogs", proxyId],
    queryFn: () => apiFetch<{ logs: string; proxyId: string }>(`/proxies/${proxyId}/logs`),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nordUser: string; nordPass: string } }) =>
      apiFetch<Proxy>(`/proxies/${id}/credentials`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useSetAllowedIps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allowedIps }: { id: string; allowedIps: string[] | null }) =>
      apiFetch<Proxy>(`/proxies/${id}/allowed-ips`, { method: "PATCH", body: JSON.stringify({ allowedIps }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROXIES_QUERY_KEY }),
  });
}

export function useGetCountries(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => apiFetch<Array<{ code: string; name: string; flag: string }>>("/countries"),
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}
