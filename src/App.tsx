import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { useAuthStore } from '@/store/auth-store'
import { authApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function App() {
  const status = useAuthStore((s) => s.status)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setStatus = useAuthStore((s) => s.setStatus)

  useEffect(() => {
    let isMounted = true
    async function initAuth() {
      try {
        const res = await authApi.refresh()
        if (isMounted) {
          setAuth(res.accessToken, res.user || null)
        }
      } catch {
        if (isMounted) {
          setStatus('unauthenticated')
        }
      }
    }

    initAuth()
    return () => {
      isMounted = false
    }
  }, [setAuth, setStatus])

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Checking session...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
