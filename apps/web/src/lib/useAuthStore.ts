import { create } from "zustand";
import type { AuthUser } from "@brightloop/shared";
import { setAuthToken } from "./apiClient.ts";

const STORAGE_KEY_TOKEN = "brightloop_auth_token";
const STORAGE_KEY_USER = "brightloop_auth_user";

function loadInitialState(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEY_USER);
    if (token && userJson) {
      const user = JSON.parse(userJson) as AuthUser;
      setAuthToken(token);
      return { token, user };
    }
  } catch {
    // Ignore storage parse errors
  }
  setAuthToken(null);
  return { token: null, user: null };
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
}

const initial = loadInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  isAuthenticated: initial.token !== null && initial.user !== null,
  setSession: (token: string, user: AuthUser) => {
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {
      // Ignore storage write errors
    }
    setAuthToken(token);
    set({ token, user, isAuthenticated: true });
  },
  clearSession: () => {
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {
      // Ignore storage errors
    }
    setAuthToken(null);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

