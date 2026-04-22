import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL + "api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...authHeaders(), ...(options?.headers ?? {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || err.message || "Request failed");
  }
  return res.json();
}

export function useAccountProfile() {
  const token = localStorage.getItem("auth_token");
  return useQuery({
    queryKey: ["account"],
    queryFn: () => apiFetch<{ id: string; email: string; name: string; role: string; balance: string; twoFaEnabled: boolean; createdAt: string }>("/account"),
    enabled: !!token,
  });
}

export function useChangeEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { newEmail: string; currentPassword: string }) =>
      apiFetch("/account/email", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account"] }); qc.invalidateQueries({ queryKey: ["/auth/me"] }); },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiFetch("/account/password", { method: "PUT", body: JSON.stringify(data) }),
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: () => apiFetch<{ secret: string; otpauthUrl: string; qrDataUrl: string }>("/account/2fa/setup", { method: "POST" }),
  });
}

export function useEnable2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string }) =>
      apiFetch("/account/2fa/enable", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account"] }),
  });
}

export function useDisable2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { currentPassword: string }) =>
      apiFetch("/account/2fa/disable", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account"] }),
  });
}

export function useSubmitTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; network: string; txHash: string }) =>
      apiFetch<{ autoApproved: boolean; verifyReason?: string; newBalance?: string }>(
        "/account/topup", { method: "POST", body: JSON.stringify(data) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-topups"] });
      qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useTopupHistory() {
  return useQuery({
    queryKey: ["account-topups"],
    queryFn: () => apiFetch<Array<{ id: number; amount: string; network: string; txHash: string; status: string; note: string | null; createdAt: string }>>("/account/topups"),
  });
}

export function useAdminTopups() {
  return useQuery({
    queryKey: ["admin-topups"],
    queryFn: () => apiFetch<Array<{ id: number; userId: number; amount: string; network: string; txHash: string; status: string; note: string | null; createdAt: string; userEmail: string | null; userName: string | null }>>("/admin/topups"),
  });
}

export function useApproveTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/topups/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-topups"] }),
  });
}

export function useRejectTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiFetch(`/admin/topups/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-topups"] }),
  });
}

export interface CloudSubscription {
  id: number;
  userId: number;
  proxyCount: number;
  pricePerMonth: string;
  currency: string;
  startsAt: string;
  expiresAt: string;
  status: string;
  createdAt: string;
}

export interface CloudSubEvent {
  id: number;
  subscriptionId: number;
  action: string;
  proxyCountBefore: number;
  proxyCountAfter: number;
  expiresAtBefore: string;
  expiresAtAfter: string;
  amount: string;
  note: string | null;
  createdAt: string;
}

export interface CloudSubscriptionResponse {
  subscription: CloudSubscription | null;
  events?: CloudSubEvent[];
  pricePerMonth: number;
  currency: string;
}

export function useCloudSubscription() {
  return useQuery({
    queryKey: ["cloud-subscription"],
    queryFn: () => apiFetch<CloudSubscriptionResponse>("/cloud/subscription"),
  });
}

export function useBuyCloud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { proxyCount: number; months: number }) =>
      apiFetch<{ subscription: CloudSubscription; amount: number; newBalance: string }>("/cloud/buy", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud-subscription"] });
      qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useAddCloudProxies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { additionalProxies: number }) =>
      apiFetch<{ subscription: CloudSubscription; amount: number; newBalance: string }>("/cloud/add-proxies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud-subscription"] });
      qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useExtendCloud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { months: number }) =>
      apiFetch<{ subscription: CloudSubscription; amount: number; newBalance: string }>("/cloud/extend", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud-subscription"] });
      qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useAdminCloudSubscriptions() {
  return useQuery({
    queryKey: ["admin-cloud-subs"],
    queryFn: () => apiFetch<Array<{ id: number; userId: number; email: string | null; name: string | null; proxyCount: number; pricePerMonth: string; currency: string; startsAt: string; expiresAt: string; status: string; createdAt: string }>>("/admin/cloud-subscriptions"),
  });
}
