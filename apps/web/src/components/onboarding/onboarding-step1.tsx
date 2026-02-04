import React from "react"

import { useState, useEffect } from "react"
import { ArrowRight, GripVertical, DollarSign, Users, Zap, CalendarX, Phone, Calendar, UserPlus } from "lucide-react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Priority, PainPoint } from '@/types/onboarding'

export function OnboardingStep1() {
  const navigate = useNavigate()
  const { data, updateStep1 } = useOnboarding()

  const [priorities, setPriorities] = useState<Priority[]>([
    {
      id: "revenue",
      title: "Increase Revenue",
      description: "Focus on high-value procedures and billing efficiency",
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: "retention",
      title: "Patient Retention",
      description: "Improve follow-ups and long-term care engagement",
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "efficiency",
      title: "Operational Efficiency",
      description: "Reduce time spent on administrative scheduling",
      icon: <Zap className="w-5 h-5" />,
    },
  ])

  const [painPoints, setPainPoints] = useState<PainPoint[]>([
    {
      id: "no-shows",
      title: "Patient No-shows",
      description: "Missed appointments affecting revenue",
      icon: <CalendarX className="w-5 h-5" />,
      selected: true,
    },
    {
      id: "follow-ups",
      title: "Manual Follow-ups",
      description: "Staff spends hours on WhatsApp/Phone",
      icon: <Phone className="w-5 h-5" />,
      selected: false,
    },
    {
      id: "conflicts",
      title: "Booking Conflicts",
      description: "Double-bookings or calendar syncing issues",
      icon: <Calendar className="w-5 h-5" />,
      selected: false,
    },
    {
      id: "intake",
      title: "Intake Friction",
      description: "Slow process for onboarding new patients",
      icon: <UserPlus className="w-5 h-5" />,
      selected: false,
    },
  ])

  const [additionalNotes, setAdditionalNotes] = useState("")
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  // Load data from context on mount
  useEffect(() => {
    if (data.step1.priorities.length > 0) {
      setPriorities(data.step1.priorities)
    }
    if (data.step1.painPoints.length > 0) {
      setPainPoints(data.step1.painPoints)
    }
    if (data.step1.additionalNotes) {
      setAdditionalNotes(data.step1.additionalNotes)
    }
  }, [])

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newPriorities = [...priorities]
    const draggedPriority = newPriorities[draggedItem]
    newPriorities.splice(draggedItem, 1)
    newPriorities.splice(index, 0, draggedPriority)
    setPriorities(newPriorities)
    setDraggedItem(index)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const togglePainPoint = (id: string) => {
    setPainPoints(points =>
      points.map(point =>
        point.id === id ? { ...point, selected: !point.selected } : point
      )
    )
  }

  const handleContinue = () => {
    // Save data to context
    updateStep1({
      priorities,
      painPoints,
      additionalNotes,
    })
    // Navigate to next step
    navigate({ to: '/onboarding/step-2' })
  }

  const handleBack = () => {
    navigate({ to: '/onboarding' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-center px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-pink-500">Carol</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">Step 1 of 5</span>
        </div>
        <div className="absolute right-8">
          <span className="text-lg font-semibold text-pink-500">20%</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div className="h-full bg-gradient-to-r from-pink-500 to-pink-400 w-[20%]" />
      </div>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-3xl mx-auto py-12 px-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Etapa 1: Clinic Objectives
          </h1>
          <p className="text-muted-foreground mb-10">
            Help Carol understand what matters most to your clinic right now.
          </p>

          {/* Rank Priorities Section */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Rank your priorities
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Drag items to reorder by importance
            </p>

            <div className="space-y-3">
              {priorities.map((priority, index) => (
                <div
                  key={priority.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 bg-white rounded-xl p-4 border border-border cursor-grab active:cursor-grabbing transition-all ${
                    draggedItem === index ? "opacity-50 scale-[0.98]" : ""
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                    {priority.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{priority.title}</h3>
                    <p className="text-sm text-muted-foreground">{priority.description}</p>
                  </div>
                  <span className="text-2xl font-light text-pink-300">{index + 1}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Pain Points Section */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Operation pain points
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select the bottlenecks Carol should tackle first
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {painPoints.map((point) => (
                <button
                  key={point.id}
                  onClick={() => togglePainPoint(point.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                    point.selected
                      ? "border-pink-300 bg-pink-50"
                      : "border-border bg-white hover:border-pink-200"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    point.selected ? "bg-pink-100 text-pink-500" : "bg-gray-100 text-muted-foreground"
                  }`}>
                    {point.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{point.title}</h3>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    point.selected ? "border-pink-500 bg-pink-500" : "border-gray-300"
                  }`}>
                    {point.selected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Additional Notes Section */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Anything else we should know?
            </h2>
            <Textarea
              placeholder="Tell us more about your daily routine or specific challenges..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </section>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-muted-foreground"
            >
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
