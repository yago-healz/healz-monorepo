import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useLogoutMutation } from '@/features/auth/api/mutations'
import type { User } from '@/types/api.types'

interface UserNavProps {
  user: User
}

export function UserNav({ user }: UserNavProps) {
  const logoutMutation = useLogoutMutation()
  const { state } = useSidebar()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const trigger = (
    <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md transition-[width,height,padding] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:justify-center">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </div>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {state === 'collapsed' ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="flex flex-col gap-0.5">
            <span className="font-semibold">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
