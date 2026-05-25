import { create } from 'zustand';
import { User } from '@/types';

interface UIState {
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  pageTitle: '',
  setPageTitle: (title) => set({ pageTitle: title }),
}));

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
  me: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
  me: async () => {
    try {
      const { authAPI } = await import('@/lib/api');
      const res = await authAPI.me();
      if (res.data?.data) {
        const token = localStorage.getItem('token') || '';
        localStorage.setItem('user', JSON.stringify(res.data.data));
        set({ user: res.data.data, isAuthenticated: true, token });
      }
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  loadTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { theme: newTheme };
    }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  loadTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
}));

interface LangState {
  lang: 'en' | 'id';
  translations: Record<string, string>;
  setLang: (lang: 'en' | 'id') => void;
  setTranslations: (t: Record<string, string>) => void;
  t: (key: string) => string;
  loadLang: () => void;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: 'en',
  translations: {},
  setLang: (lang) => {
    localStorage.setItem('lang', lang);
    set({ lang });
  },
  setTranslations: (translations) => set({ translations }),
  t: (key) => get().translations[key] || key,
  loadLang: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('lang') as 'en' | 'id' | null;
    set({ lang: saved || 'en' });
  },
}));

interface RealtimeState {
  onlineCount: number;
  setOnlineCount: (count: number) => void;
  newMessage: boolean;
  setNewMessage: (value: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  onlineCount: 0,
  setOnlineCount: (count) => set({ onlineCount: count }),
  newMessage: false,
  setNewMessage: (value) => set({ newMessage: value }),
}));
