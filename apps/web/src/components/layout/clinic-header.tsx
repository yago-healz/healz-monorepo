import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { tokenService } from '@/services/token.service'

export function ClinicHeader() {
  const user = tokenService.getUser()
  const clinicName = user?.activeClinic?.name ?? 'Clínica'

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex flex-1 items-center justify-between">
        <div className="text-sm font-medium">{clinicName}</div>
      </div>
    </header>
  )
}
