import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userAPI } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const { data } = await userAPI.getMe();
          set({ user: data });
        } catch (e) {
          console.error('Failed to refresh user', e);
        }
      },
    }),
    { name: 'lifedrop-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

export const useAppStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  activeSOS: null,

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  addNotification: (notif) => set((state) => ({
    notifications: [notif, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),
  clearUnread: () => set({ unreadCount: 0 }),
  setActiveSOS: (sos) => set({ activeSOS: sos }),
}));
