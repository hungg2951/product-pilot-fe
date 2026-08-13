import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useShopStore } from '@/store/shop-store'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach active shop id on every request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const shopId = useShopStore.getState().activeShopId
    if (shopId) {
      config.headers['x-shop-id'] = shopId
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — unwrap error messages from backend format
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success: boolean; error?: string }>) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.'

    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message)

    return Promise.reject(new Error(message))
  }
)