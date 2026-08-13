import { axiosInstance } from '@/lib/axios'
import type { AuthUser } from '@/store/auth-store'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface RefreshResponse {
  accessToken: string
  user?: AuthUser
}

export interface LogoutResponse {
  success: boolean
}

export const authApi = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const res = await axiosInstance.post<LoginResponse>('/auth/login', data)
    return res.data
  },
  refresh: async (): Promise<RefreshResponse> => {
    const res = await axiosInstance.post<RefreshResponse>('/auth/refresh')
    return res.data
  },
  logout: async (): Promise<LogoutResponse> => {
    const res = await axiosInstance.post<LogoutResponse>('/auth/logout')
    return res.data
  },
}
