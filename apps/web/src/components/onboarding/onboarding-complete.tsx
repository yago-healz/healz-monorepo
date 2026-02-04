import { useEffect, useState } from "react"
import { useNavigate } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Sparkles, Check, ArrowRight } from "lucide-react"

export function OnboardingComplete() {
  const navigate = useNavigate()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Animate content appearance
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const handleGoToDashboard = () => {
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-pink-400 to-purple-500 flex items-center justify-center p-6">
      <div
        className={`max-w-2xl w-full transition-all duration-700 transform ${
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
          {/* Animated Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-pink-500 to-pink-400 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Carol is Activated!
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Your AI assistant is now ready to transform your patient journey
            </p>
            <p className="text-sm text-muted-foreground">
              Carol will now handle appointment scheduling, follow-ups, and patient communications automatically.
            </p>
          </div>

          {/* Features List */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-center gap-3 text-left max-w-md mx-auto">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Intelligent Scheduling</p>
                <p className="text-sm text-muted-foreground">
                  Carol manages appointments based on your preferences
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-left max-w-md mx-auto">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Automated Follow-ups</p>
                <p className="text-sm text-muted-foreground">
                  Never miss a patient check-in again
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-left max-w-md mx-auto">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">24/7 Patient Support</p>
                <p className="text-sm text-muted-foreground">
                  Carol responds to patient inquiries anytime
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleGoToDashboard}
            className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Additional Info */}
          <p className="text-xs text-muted-foreground mt-6">
            Need help getting started?{" "}
            <a href="#" className="text-pink-500 hover:underline">
              Check out our quick start guide
            </a>
          </p>
        </div>

        {/* Bottom Text */}
        <p className="text-center text-white text-sm mt-6 opacity-90">
          Welcome to the future of patient care with Carol AI
        </p>
      </div>
    </div>
  )
}
