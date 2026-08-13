import { useState } from 'react'
import { ShopSelector } from './ShopSelector'
import { NAV_ITEMS, SidebarContent } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Find active item title
  const activeItem = NAV_ITEMS.find(
    (item) =>
      location.pathname === item.path ||
      (item.path === '/products' && location.pathname === '/')
  )
  const title = activeItem ? activeItem.label : 'Dashboard'

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

      {/* Header Actions: Shop Selector */}
      <div className="flex items-center gap-2">
        <ShopSelector />
      </div>
    </header>
  )
}
