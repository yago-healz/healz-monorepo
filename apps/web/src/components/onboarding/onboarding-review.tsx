import { useState } from "react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  CheckCircle,
  Pencil,
  Target,
  Clock,
  Heart,
  Rocket,
  Info
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function OnboardingReview() {
  const navigate = useNavigate()
  const { data } = useOnboarding()
  const [isActivating, setIsActivating] = useState(false)

  const handleActivate = () => {
    setIsActivating(true)
    setTimeout(() => {
      navigate({ to: '/onboarding/complete' })
    }, 1500)
  }

  const handleBack = () => {
    navigate({ to: '/onboarding/step-5' })
  }

  const handleEditGoals = () => {
    navigate({ to: '/onboarding/step-1' })
  }

  const handleEditSchedule = () => {
    navigate({ to: '/onboarding/step-2' })
  }

  const handleEditTraits = () => {
    navigate({ to: '/onboarding/step-3' })
  }

  // Generate summary text from data
  const prioritiesSummary = data.step1.priorities.length > 0
    ? data.step1.priorities.map(p => p.title).join(', ')
    : 'Appointment Reminders, Post-Op Follow-up, Medication Adherence'

  const traitsSummary = data.step3.selectedTraits.length > 0
    ? data.step3.selectedTraits.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
    : 'Empathetic, Professional, Concise'

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
            <span className="text-sm text-muted-foreground">Patient Journey SaaS</span>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white text-sm">
              Get Help
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-pink-100 text-pink-500 text-xs">A</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Progress Section */}
          <Card className="mb-8 border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-foreground">
                  Onboarding Complete
                </span>
                <span className="text-sm font-semibold text-pink-500">100%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Final Step: Review & Activation
              </div>
            </CardContent>
          </Card>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Review & Activate Carol
            </h1>
            <p className="text-muted-foreground">
              Everything looks ready to go. Here's a summary of your AI agent's configuration.
            </p>
          </div>

          {/* Edit Later Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">You can edit this later</p>
                <p className="text-sm text-muted-foreground">
                  Don't worry, you can refine Carol's behavior and settings at any time from your dashboard after activation.
                </p>
              </div>
            </div>
            <a href="#" className="text-sm text-pink-500 hover:underline whitespace-nowrap flex items-center gap-1">
              View documentation
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {/* Prioritized Goals Card */}
            <Card className="border-border shadow-sm overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-pink-300 via-pink-400 to-purple-400" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Prioritized Goals</h3>
                  <Target className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {prioritiesSummary}
                </p>
                <button
                  onClick={handleEditGoals}
                  className="text-sm text-pink-500 hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Goals
                </button>
              </CardContent>
            </Card>

            {/* Schedule Rules Card */}
            <Card className="border-border shadow-sm overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-cyan-300 via-teal-400 to-green-400" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Schedule Rules</h3>
                  <Clock className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Monday - Friday, 9 AM - 6 PM EST. Immediate response enabled for urgent queries.
                </p>
                <button
                  onClick={handleEditSchedule}
                  className="text-sm text-pink-500 hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Schedule
                </button>
              </CardContent>
            </Card>

            {/* Personality Traits Card */}
            <Card className="border-border shadow-sm overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Personality Traits</h3>
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {traitsSummary}. Tone: Reassuring and patient-centric.
                </p>
                <button
                  onClick={handleEditTraits}
                  className="text-sm text-pink-500 hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Traits
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Activation Section */}
          <div className="border-t border-border pt-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to launch?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your patient journey AI agent is fully configured and ready to start assisting your patients.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handleActivate}
                disabled={isActivating}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 text-base"
              >
                {isActivating ? (
                  <>
                    <span className="animate-spin mr-2">
                      <Rocket className="w-5 h-5" />
                    </span>
                    Activating...
                  </>
                ) : (
                  <>
                    Activate Carol
                    <Rocket className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-8 py-6 text-base border-border text-foreground bg-transparent"
              >
                Back
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              By activating, you agree to our{" "}
              <a href="#" className="text-pink-500 hover:underline">
                AI Safety Guidelines
              </a>{" "}
              and{" "}
              <a href="#" className="text-pink-500 hover:underline">
                Terms of Service
              </a>
              .
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center text-sm text-muted-foreground mt-12">
            &copy; 2024 Carol AI - Patient Journey SaaS. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  )
}
