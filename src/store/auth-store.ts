import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  status: 'checking' | 'authenticated' | 'unauthenticated'
  setAuth: (accessToken: string, user?: AuthUser | null) => void
  clearAuth: () => void
  setStatus: (status: AuthState['status']) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'checking', // starts as 'checking' until the initial silent-refresh attempt resolves
  setAuth: (accessToken, user) =>
    set((state) => ({
      accessToken,
      user: user !== undefined ? user : state.user,
      status: 'authenticated',
    })),
  clearAuth: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}))
