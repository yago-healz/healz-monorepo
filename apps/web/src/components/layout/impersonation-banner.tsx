import { ShieldAlert } from 'lucide-react'
import { tokenService } from '@/services/token.service'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  if (!tokenService.isImpersonating()) return null

  const user = tokenService.getUser()

  function handleExit() {
    tokenService.restoreOriginalSession()
    window.location.href = '/admin'
  }

  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Você está logado como <strong>{user?.name}</strong>{' '}
          ({user?.email})
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-white bg-transparent text-white hover:bg-white hover:text-amber-600"
        onClick={handleExit}
      >
        Encerrar Impersonação
      </Button>
    </div>
  )
}
