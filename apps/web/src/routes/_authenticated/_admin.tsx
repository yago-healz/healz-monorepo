import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated/_admin')({
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
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
