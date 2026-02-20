import { Button } from '@/components/ui/button'
import { tokenService } from '@/services/token.service'
import { ShieldAlert } from 'lucide-react'
import { useEffect } from 'react'

const BANNER_HEIGHT = '3rem'

export function ImpersonationBanner() {
  const isImpersonating = tokenService.isImpersonating()
  const user = tokenService.getUser()

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-offset',
      isImpersonating ? BANNER_HEIGHT : '0px',
    )
  }, [isImpersonating])

  if (!isImpersonating) return null

  function handleExit() {
    tokenService.restoreOriginalSession()
    window.location.href = '/admin'
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-white">
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
