import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  plan: 'free' | 'pro' | 'enterprise';
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;

  // UI
  notifications: Notification[];
  isLoading: boolean;
  theme: 'dark' | 'light';

  // Actions — Auth
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;

  // Actions — Workspaces
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (ws: Workspace) => void;
  setActiveWorkspace: (ws: Workspace | null) => void;
  removeWorkspace: (id: string) => void;

  // Actions — UI
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

// ============================================================
// STORE
// ============================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      workspaces: [],
      activeWorkspace: null,
      notifications: [],
      isLoading: false,
      theme: 'dark',

      // Auth actions
      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      clearAuth: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          activeWorkspace: null,
          workspaces: [],
        }),

      setToken: (token) => set({ token }),

      // Workspace actions
      setWorkspaces: (workspaces) => set({ workspaces }),

      addWorkspace: (ws) =>
        set((state) => ({ workspaces: [...state.workspaces, ws] })),

      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

      removeWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          activeWorkspace:
            state.activeWorkspace?.id === id ? null : state.activeWorkspace,
        })),

      // UI actions
      addNotification: (n) => {
        const id = `notif-${Date.now()}-${Math.random()}`;
        set((state) => ({
          notifications: [...state.notifications, { ...n, id }],
        }));
        // Auto-remove after duration (default 4s)
        setTimeout(() => {
          get().removeNotification(id);
        }, n.duration ?? 4000);
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'codeverse-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
      }),
    }
  )
);
