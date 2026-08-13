import { useState } from 'react'
import { ShopSelector } from './ShopSelector'
import { NAV_ITEMS, SidebarContent } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { authApi } from '@/lib/api'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Find active item title
  const activeItem = NAV_ITEMS.find(
    (item) =>
      location.pathname === item.path ||
      (item.path === '/products' && location.pathname === '/')
  )
  const title = activeItem ? activeItem.label : 'Dashboard'

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authApi.logout()
    } catch (err) {
      console.error('[Logout] Failed to notify backend:', err)
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu (<768px) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Dynamic Page Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
      </div>

      {/* Header Actions: Shop Selector & User Menu / Logout */}
      <div className="flex items-center gap-3">
        <ShopSelector />

        <div className="flex items-center gap-2 pl-2 border-l border-border/60">
          {user && (
            <div className="hidden sm:flex flex-col text-right truncate max-w-[140px]">
              <span className="text-xs font-semibold truncate text-foreground">
                {user.name || user.email}
              </span>
              {user.name && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
