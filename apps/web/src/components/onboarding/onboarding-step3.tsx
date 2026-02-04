import { useState, useEffect } from "react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ArrowRight, MessageSquare, Ban, GitBranch, Heart, HelpCircle, Settings } from "lucide-react"
import { PERSONALITY_TRAITS } from '@/types/onboarding'

export function OnboardingStep3() {
  const navigate = useNavigate()
  const { data, updateStep3 } = useOnboarding()

  const [selectedTraits, setSelectedTraits] = useState<string[]>(["welcoming", "empathetic"])
  const [greeting, setGreeting] = useState(
    "Hi! I'm Carol, your virtual assistant. I'm here to help you schedule appointments, answer questions about our services, or route you to a specialist. How can I help you today?"
  )
  const [restrictSensitiveTopics, setRestrictSensitiveTopics] = useState(true)

  // Load data from context on mount
  useEffect(() => {
    if (data.step3.selectedTraits.length > 0) {
      setSelectedTraits(data.step3.selectedTraits)
    }
    if (data.step3.greeting) {
      setGreeting(data.step3.greeting)
    }
    setRestrictSensitiveTopics(data.step3.restrictSensitiveTopics)
  }, [])

  const toggleTrait = (traitId: string) => {
    setSelectedTraits((prev) =>
      prev.includes(traitId) ? prev.filter((t) => t !== traitId) : [...prev, traitId]
    )
  }

  const handleContinue = () => {
    // Save data to context
    updateStep3({
      selectedTraits,
      greeting,
      restrictSensitiveTopics,
    })
    // Navigate to next step
    navigate({ to: '/onboarding/step-4' })
  }

  const handleBack = () => {
    navigate({ to: '/onboarding/step-2' })
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
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-pink-500 uppercase">
                Onboarding Process
              </span>
              <span className="text-sm text-muted-foreground">
                Step 3 of 5 • <span className="text-pink-500 font-medium">60%</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: "60%" }}
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Step 3: Teaching Carol
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Define how Carol interacts with your patients. This will shape her tone, empathy levels, and conversation boundaries.
            </p>
          </div>

          {/* Personality Section */}
          <Card className="mb-6 border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-pink-500" />
                <h2 className="font-semibold text-foreground">Personality</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select the adjectives that best describe how Carol should speak to patients.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PERSONALITY_TRAITS.map((trait) => (
                  <button
                    key={trait.id}
                    onClick={() => toggleTrait(trait.id)}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedTraits.includes(trait.id)
                        ? "border-pink-500 bg-pink-50 text-pink-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {trait.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Initial Greeting Section */}
          <Card className="mb-6 border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-pink-500" />
                <h2 className="font-semibold text-foreground">Initial Greeting</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                How Carol introduces herself
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="min-h-24 bg-transparent border-none resize-none focus-visible:ring-0 text-foreground"
                  placeholder="Enter Carol's greeting message..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card className="mb-8 border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              {/* Restrict Sensitive Topics */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Ban className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground">Restrict Sensitive Topics</h3>
                    <p className="text-sm text-muted-foreground">
                      Should Carol avoid discussing medical diagnoses or billing?
                    </p>
                  </div>
                </div>
                <Switch
                  checked={restrictSensitiveTopics}
                  onCheckedChange={setRestrictSensitiveTopics}
                  className="data-[state=checked]:bg-pink-500"
                />
              </div>

              {/* Routing Rules */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-5 h-5 text-pink-500" />
                  <h3 className="font-semibold text-foreground">Routing Rules</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Define when Carol should hand over to a human agent
                </p>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-2">
                    Transfer to a human agent if:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Patient expresses high levels of distress.</li>
                    <li>Specifically mentions an urgent medical emergency.</li>
                    <li>Asks for a human operator more than twice.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              className="bg-pink-500 hover:bg-pink-600 text-white px-8"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
