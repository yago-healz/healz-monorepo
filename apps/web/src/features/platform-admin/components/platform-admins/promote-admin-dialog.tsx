import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsers } from '../../api/users-api'
import { usePromotePlatformAdmin } from '../../api/platform-admins-api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'

export function PromoteAdminDialog() {
  const [open, setOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: usersData } = useUsers({ limit: 100, status: 'active' })
  const promote = usePromotePlatformAdmin()

  const selectedUser = usersData?.data?.find((u) => u.id === selectedUserId)

  const handlePromote = async () => {
    if (!selectedUserId) return
    await promote.mutateAsync({ userId: selectedUserId })
    setOpen(false)
    setSelectedUserId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promover Usuário a Platform Admin</DialogTitle>
          <DialogDescription>
            Selecione um usuário existente para conceder permissões de platform admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Usuário</Label>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="w-full justify-between"
              >
                {selectedUser ? selectedUser.name : 'Selecionar usuário...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar usuário..." />
                <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                <CommandList>
                  {usersData?.data?.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.name} ${user.email}`}
                      onSelect={() => {
                        setSelectedUserId(user.id)
                        setComboOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedUserId === user.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handlePromote}
            disabled={!selectedUserId || promote.isPending}
          >
            {promote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Promover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
