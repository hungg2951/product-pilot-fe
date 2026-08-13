import { cn } from '@/lib/utils'
import { Package } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Link, useLocation } from 'react-router-dom'

export const NAV_ITEMS = [
  { label: 'Products', path: '/products', icon: Package },
]

interface SidebarContentProps {
  isIconOnly?: boolean
  onItemClick?: () => void
}

export function SidebarContent({ isIconOnly = false, onItemClick }: SidebarContentProps) {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col gap-6 py-4">
      {/* Brand Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4',
          isIconOnly && 'justify-center px-2'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Package className="h-5 w-5" />
        </div>
        {!isIconOnly && (
          <div className="flex flex-col truncate">
            <span className="font-bold text-base tracking-tight leading-none text-foreground">
              Product Pilot
            </span>
            <span className="text-[11px] text-muted-foreground font-medium mt-1">
              Content Management
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={100}>
        <nav className="flex flex-1 flex-col gap-1.5 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path === '/products' && location.pathname === '/')

            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isIconOnly && 'justify-center px-0 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
                {!isIconOnly && <span>{item.label}</span>}
              </Link>
            )

            if (isIconOnly) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>
      </TooltipProvider>

      {/* Footer Info */}
      {!isIconOnly && (
        <div className="px-4 py-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between items-center">
          <span>Shopify + AI</span>
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold">
            v1.0
          </span>
        </div>
      )}
    </div>
  )
}

export function DesktopSidebar() {
  return (
    <>
      {/* Desktop: expanded >= 1024px (lg) */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/50 backdrop-blur-xs h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Tablet: icon-only mode 768px-1023px (md to lg) */}
      <aside className="hidden md:flex lg:hidden w-16 shrink-0 flex-col border-r border-border/60 bg-sidebar/50 backdrop-blur-xs h-screen sticky top-0">
        <SidebarContent isIconOnly />
      </aside>
    </>
  )
}
