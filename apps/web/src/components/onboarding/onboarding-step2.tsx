import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight, Plus, Minus, Trash2, Briefcase, Calendar, HelpCircle } from "lucide-react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Service, TimeBlock } from '@/types/onboarding'

export function OnboardingStep2() {
  const navigate = useNavigate()
  const { data, updateStep2 } = useOnboarding()

  const [services, setServices] = useState<Service[]>([
    {
      id: "initial",
      title: "Initial Consultation",
      description: "First contact with new patients",
      duration: "45",
      value: "350.00",
    },
    {
      id: "return",
      title: "Return",
      description: "Follow-up within 30 days",
      duration: "20",
      value: "0.00",
    },
    {
      id: "procedures",
      title: "Procedures",
      description: "Exams and minor interventions",
      duration: "120",
      value: "800.00",
      note: "Patients should be advised to arrive 15 minutes early for paperwork.",
    },
  ])

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { id: "1", from: "12:00", to: "14:00" },
  ])

  const [minimumInterval, setMinimumInterval] = useState(15)
  const [expandedNotes, setExpandedNotes] = useState<string[]>(["procedures"])

  // Load data from context on mount
  useEffect(() => {
    if (data.step2.services.length > 0) {
      setServices(data.step2.services)
    }
    if (data.step2.timeBlocks.length > 0) {
      setTimeBlocks(data.step2.timeBlocks)
    }
    if (data.step2.minimumInterval) {
      setMinimumInterval(data.step2.minimumInterval)
    }
  }, [])

  const updateService = (id: string, field: keyof Service, value: string) => {
    setServices(services.map(service =>
      service.id === id ? { ...service, [field]: value } : service
    ))
  }

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev =>
      prev.includes(id)
        ? prev.filter(noteId => noteId !== id)
        : [...prev, id]
    )
  }

  const addTimeBlock = () => {
    setTimeBlocks([...timeBlocks, { id: Date.now().toString(), from: "09:00", to: "10:00" }])
  }

  const removeTimeBlock = (id: string) => {
    setTimeBlocks(timeBlocks.filter(block => block.id !== id))
  }

  const updateTimeBlock = (id: string, field: "from" | "to", value: string) => {
    setTimeBlocks(timeBlocks.map(block =>
      block.id === id ? { ...block, [field]: value } : block
    ))
  }

  const handleContinue = () => {
    // Save data to context
    updateStep2({
      services,
      timeBlocks,
      minimumInterval,
    })
    // Navigate to next step
    navigate({ to: '/onboarding/step-3' })
  }

  const handleBack = () => {
    navigate({ to: '/onboarding/step-1' })
  }

  const handleSave = () => {
    // Save data to context
    updateStep2({
      services,
      timeBlocks,
      minimumInterval,
    })
  }

  const handleCancel = () => {
    navigate({ to: '/onboarding' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">◆</span>
          </div>
          <span className="font-semibold text-foreground">Carol AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white"
          >
            Save Progress
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Title Section */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs text-pink-500 uppercase tracking-wider font-medium">
                Onboarding
              </span>
              <h1 className="text-2xl font-bold text-foreground mt-1">
                Etapa 2: Operational Flow
              </h1>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Step 2 of 5</span>
              <p className="text-2xl font-bold text-foreground">40%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 rounded-full mb-6">
            <div className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full w-[40%]" />
          </div>

          <p className="text-muted-foreground mb-8">
            Define how Carol manages your patient appointments and schedules.
          </p>

          {/* Services & Procedures Section */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-foreground">
                Services & Procedures
              </h2>
            </div>

            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl border border-border p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Duration (min)
                        </label>
                        <Select
                          value={service.duration}
                          onValueChange={(value) => updateService(service.id, "duration", value)}
                        >
                          <SelectTrigger className="w-32 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="20">20 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                            <SelectItem value="120">120 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Value (R$)
                        </label>
                        <Input
                          type="text"
                          value={service.value}
                          onChange={(e) => updateService(service.id, "value", e.target.value)}
                          className="w-32 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  {expandedNotes.includes(service.id) && service.note ? (
                    <div className="mt-4 p-4 bg-pink-50 rounded-lg">
                      <p className="text-xs text-pink-500 uppercase tracking-wide mb-1">
                        Note for Carol:
                      </p>
                      <p className="text-sm text-foreground">{service.note}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleNotes(service.id)}
                      className="mt-4 flex items-center gap-1 text-pink-500 text-sm hover:text-pink-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add internal notes for Carol
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Schedule Rules Section */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-foreground">
                Schedule Rules
              </h2>
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Blocked Times */}
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Blocked Times</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Times when Carol should never book appointments (e.g., Lunch, Admin work).
                  </p>

                  {timeBlocks.map((block) => (
                    <div key={block.id} className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={block.from}
                          onChange={(e) => updateTimeBlock(block.id, "from", e.target.value)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={block.to}
                          onChange={(e) => updateTimeBlock(block.id, "to", e.target.value)}
                          className="w-24"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeBlock(block.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <button
                    onClick={addTimeBlock}
                    className="flex items-center gap-1 text-pink-500 text-sm hover:text-pink-600 transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add time block
                  </button>
                </div>

                {/* Minimum Intervals */}
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Minimum Intervals</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Buffer time Carol should keep between different patient visits.
                  </p>

                  <div className="flex items-center justify-center gap-4 py-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMinimumInterval(Math.max(0, minimumInterval - 5))}
                      className="rounded-full"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-pink-500">{minimumInterval}</span>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        Minutes
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMinimumInterval(minimumInterval + 5)}
                      className="rounded-full"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Help Icon */}
          <div className="fixed bottom-24 right-8">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 shadow-lg bg-transparent"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
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
