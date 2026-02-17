import { useState } from 'react'
import { ChevronsUpDown, Check, Hospital } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from '@/components/ui/command'
import { useSwitchContextMutation } from '@/features/auth/api/mutations'
import { useUserRole } from '@/hooks/use-user-role'
import { useSidebar } from '@/components/ui/sidebar'

export function ClinicSwitcher() {
  const { user, activeClinic } = useUserRole()
  const { state } = useSidebar()
  const switchContext = useSwitchContextMutation()
  const [open, setOpen] = useState(false)

  const availableClinics = user?.availableClinics ?? []
  const isCollapsed = state === 'collapsed'

  const handleSelectClinic = (clinicId: string) => {
    if (clinicId === activeClinic?.id) {
      setOpen(false)
      return
    }

    switchContext.mutate(
      { clinicId },
      {
        onSuccess: () => {
          setOpen(false)
          // Page will re-render with new clinic context
        },
      }
    )
  }

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center px-2 py-2">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Hospital className="size-4" />
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="w-full rounded-lg outline-none ring-ring hover:bg-accent focus-visible:ring-2 data-[state=open]:bg-accent">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Hospital className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{activeClinic?.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {activeClinic?.role === 'admin' && 'Administrador'}
              {activeClinic?.role === 'doctor' && 'Médico'}
              {activeClinic?.role === 'secretary' && 'Secretária'}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar clínica..." />
          <CommandList>
            <CommandEmpty>Nenhuma clínica encontrada.</CommandEmpty>
            <CommandGroup>
              {availableClinics.map((clinic) => (
                <CommandItem
                  key={clinic.clinicId}
                  onSelect={() => handleSelectClinic(clinic.clinicId)}
                  className="cursor-pointer"
                >
                  <Hospital className="mr-2 size-4" />
                  <div className="flex-1">
                    <div className="font-medium">{clinic.clinicName}</div>
                    <div className="text-xs text-muted-foreground">
                      {clinic.role === 'admin' && 'Administrador'}
                      {clinic.role === 'doctor' && 'Médico'}
                      {clinic.role === 'secretary' && 'Secretária'}
                    </div>
                  </div>
                  {clinic.clinicId === activeClinic?.id && (
                    <Check className="ml-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
