import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Send } from 'lucide-react'
import type { AlertChannel } from '@/types/onboarding'

export function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    newBooking: true,
    riskOfLoss: true,
  })
  const [alertChannel, setAlertChannel] = useState<AlertChannel>('whatsapp')
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {/* Notify me when... */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-pink-500" />
              <h2 className="font-semibold text-foreground">Notify me when...</h2>
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
                <span className="text-sm text-foreground">New booking</span>
              </label>
              <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Checkbox
                  checked={notifications.riskOfLoss}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, riskOfLoss: checked as boolean }))
                  }
                  className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                />
                <span className="text-sm text-foreground">Risk of loss</span>
              </label>
            </div>
          </div>

          {/* Receive alerts via... */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-pink-500" />
              <h2 className="font-semibold text-foreground">Receive alerts via...</h2>
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
              Destination Phone Number
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
              Carol will send automated alerts to this number.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => console.log('save', { notifications, alertChannel, phoneNumber })}
        className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
      >
        Salvar
      </Button>
    </div>
  )
}
