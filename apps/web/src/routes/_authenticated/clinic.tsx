import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { ClinicSidebar } from '@/components/layout/clinic-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { tokenService } from '@/services/token.service'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'

export const Route = createFileRoute('/_authenticated/clinic')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    // Redirect platform admins to their dashboard
    if (!user?.activeClinic) {
      throw redirect({ to: '/admin' })
    }
  },
  component: ClinicLayout,
})

function ClinicLayout() {
  return (
    <div className="flex h-screen flex-col">
      <ImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <ClinicSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
