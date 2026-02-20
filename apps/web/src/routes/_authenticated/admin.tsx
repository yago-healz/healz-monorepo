import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { tokenService } from '@/services/token.service'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    // Redirect clinic staff to their dashboard
    if (user?.activeClinic) {
      throw redirect({ to: '/clinic' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex h-screen flex-col">
      <ImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
