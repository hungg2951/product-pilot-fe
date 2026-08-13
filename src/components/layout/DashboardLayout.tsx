import { DesktopSidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/sonner'
import { Outlet } from 'react-router-dom'

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50/70 dark:bg-slate-950 font-sans antialiased text-foreground">
      {/* Desktop & Tablet fixed/sticky left sidebar */}
      <DesktopSidebar />

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col min-w-0 min-h-screen">
        {/* Sticky Header */}
        <Header />

        {/* Scrollable Main Content Panel */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Card panel container matching wireframe */}
          <div className="min-h-[calc(100vh-6rem)] w-full rounded-2xl border border-border/60 bg-background p-4 sm:p-6 shadow-xs">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  )
}
