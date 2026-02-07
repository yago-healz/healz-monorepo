import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      {/* Breadcrumb will be added later */}
      <div className="flex flex-1 items-center justify-between">
        <div className="text-sm font-medium">Platform Admin</div>
      </div>
    </header>
  )
}
