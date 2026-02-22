import { Loader2 } from 'lucide-react'

interface SettingsLoadingProps {
  message?: string
}

export function SettingsLoading({ message = 'Carregando configurações...' }: SettingsLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-96">
      <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  )
}
