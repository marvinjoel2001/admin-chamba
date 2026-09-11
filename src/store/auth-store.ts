import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Máximo tiempo de inactividad permitido (2 horas)
export const MAX_INACTIVITY_MS = 2 * 60 * 60 * 1000;

export function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const exp = parseJwtExp(token);
  if (!exp) return false;
  // Margen de seguridad de 10 segundos
  return Date.now() >= exp - 10000;
}

interface AuthState {
  token: string | null;
  user: { id: string; username: string } | null;
  expiresAt: number | null;
  lastActivity: number | null;
  setAuth: (token: string, user: { id: string; username: string }) => void;
  touchActivity: () => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null,
      lastActivity: null,

      setAuth: (token, user) => {
        const exp = parseJwtExp(token);
        const now = Date.now();
        set({
          token,
          user,
          expiresAt: exp,
          lastActivity: now,
        });
      },

      touchActivity: () => {
        if (get().token) {
          set({ lastActivity: Date.now() });
        }
      },

      logout: () => {
        set({ token: null, user: null, expiresAt: null, lastActivity: null });
        try {
          localStorage.removeItem('auth-storage');
        } catch {
          // ignore
        }
      },

      isAuthenticated: () => {
        const { token, lastActivity } = get();
        if (!token) return false;

        // Validar expiración del JWT
        if (isTokenExpired(token)) {
          get().logout();
          return false;
        }

        // Validar expiración por inactividad
        if (lastActivity && Date.now() - lastActivity > MAX_INACTIVITY_MS) {
          get().logout();
          return false;
        }

        return true;
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.token) {
          const isExpired = isTokenExpired(state.token);
          const isInactive = state.lastActivity ? (Date.now() - state.lastActivity > MAX_INACTIVITY_MS) : false;
          if (isExpired || isInactive) {
            state.logout();
          }
        }
      },
    }
  )
);
