import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Send, Loader2, Trash2, Plus } from 'lucide-react'
import { SettingsLoading } from './settings-loading'
import { useClinicNotifications, useSaveClinicNotifications } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'
import type { AlertChannel, NotificationSettings } from '@/types/onboarding'

export function NotificationsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newBooking: true,
    riskOfLoss: true,
  })
  const [alertChannels, setAlertChannels] = useState<AlertChannel[]>(['whatsapp'])
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])

  const { data: savedData, isLoading: isLoadingData } = useClinicNotifications(clinicId)
  const { mutate: saveNotifications, isPending: isSaving } = useSaveClinicNotifications(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData) {
      setNotifications(savedData.notificationSettings)
      setAlertChannels(savedData.alertChannels ?? ['whatsapp'])
      setPhoneNumbers(savedData.phoneNumbers?.length ? savedData.phoneNumbers : [''])
    }
  }, [savedData])

  const handleSave = async () => {
    saveNotifications({
      notificationSettings: notifications,
      alertChannels,
      phoneNumbers: phoneNumbers.filter(Boolean),
    })
  }

  if (isLoadingData) {
    return <SettingsLoading />
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
            <div className="flex gap-4">
              {(['whatsapp', 'email'] as const).map((channel) => (
                <label key={channel} className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={alertChannels.includes(channel)}
                    onCheckedChange={(checked) =>
                      setAlertChannels((prev) =>
                        checked ? [...prev, channel] : prev.filter((c) => c !== channel)
                      )
                    }
                    className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                  />
                  <span className="text-sm text-foreground">{channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Números de Telefone de Destino
            </label>
            <div className="space-y-3">
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex flex-1 border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-r border-border text-sm text-muted-foreground">
                      +55
                    </div>
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => {
                        const updated = [...phoneNumbers]
                        updated[index] = e.target.value
                        setPhoneNumbers(updated)
                      }}
                      className="border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                  {phoneNumbers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPhoneNumbers((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhoneNumbers((prev) => [...prev, ''])}
                className="mt-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar número
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Carol enviará alertas automatizados para estes números.
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
