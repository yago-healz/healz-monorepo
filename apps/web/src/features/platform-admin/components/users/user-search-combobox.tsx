import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useUsers } from '../../api/users-api'

interface UserSearchComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UserSearchCombobox({
  value,
  onChange,
  placeholder = 'Buscar usuário...',
  disabled,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useUsers({ search: debouncedSearch, limit: 20, page: 1 })
  const users = data?.data ?? []

  const selectedUser = users.find((u) => u.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedUser ? selectedUser.name : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome ou email..."
          />
          <CommandList>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            {!isLoading && users.length === 0 && (
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onChange(user.id)
                    setOpen(false)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Check
                    className={cn('ml-auto h-4 w-4 shrink-0', value === user.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
