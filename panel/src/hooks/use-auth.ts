import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  twoFaEnabled: boolean;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: "auth-storage" }
  )
);

const BASE = import.meta.env.BASE_URL + "api";

async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

const PUBLIC_PATHS = ["/", "/login", "/register", "/terms", "/install"];

export function useAuth() {
  const { token, setToken, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(token!),
    enabled: !!token,
    retry: false,
  });

  const clearAuth = () => {
    localStorage.removeItem("auth_token");
    logout();
    queryClient.clear();
  };

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Login failed");
      return json as { token: string; user: User } | { requiresTwoFa: true; tempToken: string };
    },
    onSuccess: (data) => {
      if ("requiresTwoFa" in data) return;
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      queryClient.setQueryData(["me"], data.user);
      setLocation("/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const res = await fetch(`${BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Registration failed");
      return json as { token: string; user: User };
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      queryClient.setQueryData(["me"], data.user);
      setLocation("/dashboard");
    },
  });

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  useEffect(() => {
    if (isError) {
      clearAuth();
      const isPublic = PUBLIC_PATHS.some((p) => location === p || location.startsWith(p + "/"));
      if (!isPublic) setLocation("/login");
    }
  }, [isError]);

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!token && !!user && !isError,
    token,
    login: loginMutation,
    register: registerMutation,
    logout: handleLogout,
  };
}
