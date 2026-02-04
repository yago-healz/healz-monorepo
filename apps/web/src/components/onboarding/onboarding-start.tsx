import { ArrowRight, Bot, Clock, Shield } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function OnboardingStart() {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate({ to: '/onboarding/step-1' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">Carol AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Help
          </button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-pink-100 text-pink-600 text-xs">A</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Progress Section */}
      <div className="px-8 py-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Step 1 of 5</span>
            <h2 className="text-lg font-semibold text-foreground">Onboarding Progress</h2>
          </div>
          <span className="text-lg font-semibold text-pink-500">0%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full w-[2%]" />
        </div>
      </div>

      {/* Main Content */}
      <main className="mt-6 mx-8 rounded-3xl bg-gradient-to-br from-pink-50 via-pink-50/80 to-white min-h-[600px] relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
          <div className="absolute top-20 right-20 w-64 h-64 bg-pink-100/40 rounded-full blur-2xl" />
          <div className="absolute bottom-40 left-20 opacity-20">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-pink-300 rounded-full"
                style={{
                  left: `${Math.random() * 100}px`,
                  top: `${Math.random() * 200}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center pt-16 pb-8 px-8">
          {/* Hero Text */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-4 text-balance">
            Meet Carol, your patient journey assistant.
          </h1>
          <p className="text-muted-foreground text-center mb-12 max-w-lg">
            Inspired by the future of clinical automation and human-centric care.
          </p>

          {/* Configuration Card */}
          <div className="flex flex-col md:flex-row items-stretch bg-white rounded-2xl shadow-lg overflow-hidden max-w-3xl w-full">
            {/* Left Side - Robot Illustration */}
            <div className="bg-gradient-to-br from-pink-100 to-pink-50 p-8 flex flex-col items-center justify-center md:w-1/2">
              <div className="relative">
                {/* Decorative dots */}
                <div className="absolute -top-4 -right-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-pink-300/60 rounded-full"
                      style={{
                        left: `${(i % 3) * 8}px`,
                        top: `${Math.floor(i / 3) * 8}px`,
                      }}
                    />
                  ))}
                </div>
                <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl flex items-center justify-center relative">
                  <Bot className="w-12 h-12 text-white" />
                  {/* Eyes */}
                  <div className="absolute top-6 left-6 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute top-6 right-6 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <div className="mt-6 px-4 py-2 rounded-full border border-pink-300 bg-white/50">
                <span className="text-xs text-pink-600 font-medium uppercase tracking-wider">
                  AI Configuration Engine
                </span>
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="p-8 md:w-1/2 flex flex-col justify-center">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {"Configure Carol's Behavior"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {
                  "Everything you write from here will be used to configure Carol's behavior, tone of voice, and clinical boundaries. We'll help you tailor her responses to match your clinic's unique personality."
                }
              </p>
              <div className="flex items-center gap-2 text-pink-500 text-sm mb-6">
                <Clock className="w-4 h-4" />
                <span>Estimated time: 2 minutes</span>
              </div>
              <Button
                onClick={handleStart}
                className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white rounded-lg py-6"
              >
                Start Configuration
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                You can update these settings at any time later.
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="flex items-center gap-2 mt-12 text-muted-foreground text-sm">
            <Shield className="w-4 h-4" />
            <span>Secure & HIPAA Compliant AI Processing</span>
          </div>
        </div>
      </main>
    </div>
  )
}
