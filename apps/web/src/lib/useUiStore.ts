import { create } from "zustand";

export interface LiveEventItem {
  id: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
  summary: string;
}

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  kind?: "info" | "success" | "warning" | "error";
  durationMs?: number;
}

export interface UiState {
  isSidebarOpen: boolean;
  isActivityDrawerOpen: boolean;
  theme: "light" | "dark";
  wsConnected: boolean;
  liveEvents: LiveEventItem[];
  toasts: ToastItem[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActivityDrawerOpen: (open: boolean) => void;
  toggleActivityDrawer: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setWsConnected: (connected: boolean) => void;
  addLiveEvent: (event: Omit<LiveEventItem, "id">) => void;
  clearLiveEvents: () => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const STORAGE_KEY_THEME = "brightloop_theme";

function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "light";
}

const initialTheme = getInitialTheme();

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  isActivityDrawerOpen: false,
  theme: initialTheme,
  wsConnected: false,
  liveEvents: [],
  toasts: [],
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActivityDrawerOpen: (open) => set({ isActivityDrawerOpen: open }),
  toggleActivityDrawer: () =>
    set((state) => ({ isActivityDrawerOpen: !state.isActivityDrawerOpen })),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // Ignore
    }
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY_THEME, next);
      } catch {
        // Ignore
      }
      document.documentElement.setAttribute("data-theme", next);
      return { theme: next };
    }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  addLiveEvent: (event) =>
    set((state) => {
      const newEvent: LiveEventItem = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      const updated = [newEvent, ...state.liveEvents].slice(0, 20);
      return { liveEvents: updated };
    }),
  clearLiveEvents: () => set({ liveEvents: [] }),
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.durationMs ?? 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

