import { useState, useEffect } from "react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, Bell, Send, Settings, HelpCircle } from "lucide-react"
import type { AlertChannel } from '@/types/onboarding'

export function OnboardingStep4() {
  const navigate = useNavigate()
  const { data, updateStep4 } = useOnboarding()

  const [notifications, setNotifications] = useState({
    newBooking: true,
    riskOfLoss: true,
  })
  const [alertChannel, setAlertChannel] = useState<AlertChannel>("whatsapp")
  const [phoneNumber, setPhoneNumber] = useState("")

  // Load data from context on mount
  useEffect(() => {
    setNotifications(data.step4.notifications)
    setAlertChannel(data.step4.alertChannel)
    if (data.step4.phoneNumber) {
      setPhoneNumber(data.step4.phoneNumber)
    }
  }, [])

  const handleContinue = () => {
    // Save data to context
    updateStep4({
      notifications,
      alertChannel,
      phoneNumber,
    })
    // Navigate to next step
    navigate({ to: '/onboarding/step-5' })
  }

  const handleBack = () => {
    navigate({ to: '/onboarding/step-3' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-foreground">Carol AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-pink-500 uppercase">
                Onboarding Progress
              </span>
              <span className="text-sm font-semibold text-foreground">80%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: "80%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Step 4 of 5: Notifications & Handoff
            </p>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">Stay Informed</h1>
            <p className="text-muted-foreground">
              Choose how and when Carol should notify your team about important patient events.
            </p>
          </div>

          {/* Notification Settings Card */}
          <Card className="mb-8 border-border shadow-sm">
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
                    onClick={() => setAlertChannel("whatsapp")}
                    className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                      alertChannel === "whatsapp"
                        ? "bg-pink-500 text-white"
                        : "bg-white text-muted-foreground hover:bg-gray-50"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setAlertChannel("email")}
                    className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                      alertChannel === "email"
                        ? "bg-pink-500 text-white"
                        : "bg-white text-muted-foreground hover:bg-gray-50"
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

              <div className="border-t border-border mt-6 pt-6">
                {/* Navigation inside card */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleContinue}
                    className="bg-pink-500 hover:bg-pink-600 text-white flex-1"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Banner */}
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-6 text-center mb-8">
            <p className="text-pink-600 italic text-sm">
              "Carol ensures that your team is always ready to assist patients at the right moment."
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center text-sm text-muted-foreground">
            &copy; 2024 Carol Patient Journey AI. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  )
}
