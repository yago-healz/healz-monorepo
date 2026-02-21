import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MessageSquare, Ban, GitBranch, Heart } from 'lucide-react'
import { PERSONALITY_TRAITS } from '@/types/onboarding'

export function CarolTab() {
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['welcoming', 'empathetic'])
  const [greeting, setGreeting] = useState(
    "Hi! I'm Carol, your virtual assistant. I'm here to help you schedule appointments, answer questions about our services, or route you to a specialist. How can I help you today?"
  )
  const [restrictSensitiveTopics, setRestrictSensitiveTopics] = useState(true)

  const toggleTrait = (traitId: string) => {
    setSelectedTraits((prev) =>
      prev.includes(traitId) ? prev.filter((t) => t !== traitId) : [...prev, traitId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Personality Section */}
      <Card className="border-border shadow-sm">
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
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {trait.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Initial Greeting Section */}
      <Card className="border-border shadow-sm">
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
      <Card className="border-border shadow-sm">
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

      <Button
        onClick={() => console.log('save', { selectedTraits, greeting, restrictSensitiveTopics })}
        className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
      >
        Salvar
      </Button>
    </div>
  )
}
