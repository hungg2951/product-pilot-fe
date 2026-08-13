import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === 'checking') {
    return null // top-level bootstrap loading state in App.tsx covers this
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
