import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useShopStore } from '@/store/shop-store'
import { useAuthStore, type AuthUser } from '@/store/auth-store'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach active shop id and auth token on every request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const shopId = useShopStore.getState().activeShopId
    if (shopId) {
      config.headers['x-shop-id'] = shopId
    }

    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor — unwrap error messages from backend format & handle 401 refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ success: boolean; error?: string }>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest) {
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login')

      if (isAuthEndpoint || originalRequest._retry) {
        useAuthStore.getState().clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        const message =
          error.response?.data?.error ||
          error.message ||
          'Session expired. Please log in again.'
        return Promise.reject(new Error(message))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axiosInstance.post<{ accessToken: string; user?: AuthUser }>(
          '/auth/refresh'
        )
        const newAccessToken = data.accessToken
        useAuthStore.getState().setAuth(newAccessToken, data.user)
        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        const message =
          error.response?.data?.error ||
          error.message ||
          'Session expired. Please log in again.'
        return Promise.reject(new Error(message))
      } finally {
        isRefreshing = false
      }
    }

    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.'

    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
      message
    )

    return Promise.reject(new Error(message))
  }
)