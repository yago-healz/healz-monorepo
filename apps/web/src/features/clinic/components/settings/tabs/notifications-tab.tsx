import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Send, Loader2 } from 'lucide-react'
import { useClinicNotifications, useSaveClinicNotifications } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'
import type { AlertChannel, NotificationSettings } from '@/features/clinic/api/clinic-settings.api'

export function NotificationsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newBooking: true,
    riskOfLoss: true,
  })
  const [alertChannel, setAlertChannel] = useState<AlertChannel>('whatsapp')
  const [phoneNumber, setPhoneNumber] = useState('')

  const { data: savedData, isLoading: isLoadingData } = useClinicNotifications(clinicId)
  const { mutate: saveNotifications, isPending: isSaving } = useSaveClinicNotifications(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData) {
      setNotifications(savedData.notificationSettings)
      setAlertChannel(savedData.alertChannel as AlertChannel)
      setPhoneNumber(savedData.phoneNumber || '')
    }
  }, [savedData])

  const handleSave = async () => {
    saveNotifications({
      notificationSettings: notifications,
      alertChannel,
      phoneNumber,
    })
  }

  if (isLoadingData) {
    return (
      <div className="space-y-4 flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        <span className="text-muted-foreground">Carregando configurações...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {/* Notify me when... */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-pink-500" />
              <h2 className="font-semibold text-foreground">Notifique-me quando...</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Checkbox
                  checked={notifications.newBooking}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, newBooking: checked as boolean }))
                  }
                  className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                />
                <span className="text-sm text-foreground">Novo agendamento</span>
              </label>
              <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Checkbox
                  checked={notifications.riskOfLoss}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, riskOfLoss: checked as boolean }))
                  }
                  className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                />
                <span className="text-sm text-foreground">Risco de perda</span>
              </label>
            </div>
          </div>

          {/* Receive alerts via... */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-pink-500" />
              <h2 className="font-semibold text-foreground">Receber alertas via...</h2>
            </div>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setAlertChannel('whatsapp')}
                className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                  alertChannel === 'whatsapp'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-muted-foreground hover:bg-gray-50'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setAlertChannel('email')}
                className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                  alertChannel === 'email'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-muted-foreground hover:bg-gray-50'
                }`}
              >
                Email
              </button>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Número de Telefone de Destino
            </label>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-r border-border text-sm text-muted-foreground">
                +55
              </div>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="border-0 rounded-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Carol enviará alertas automatizados para este número.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar'
        )}
      </Button>
    </div>
  )
}
