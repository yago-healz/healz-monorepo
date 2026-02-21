import React, { useState, useEffect } from 'react'
import { GripVertical, DollarSign, Users, Zap, CalendarX, Phone, Calendar, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClinicObjectives, useSaveClinicObjectives } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'
import type { Priority, PainPoint } from '@/types/onboarding'

const DEFAULT_PRIORITIES: Priority[] = [
  {
    id: 'revenue',
    title: 'Aumentar Receita',
    description: 'Foque em procedimentos de alto valor e eficiência de faturamento',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: 'retention',
    title: 'Retenção de Pacientes',
    description: 'Melhore o acompanhamento e engajamento em cuidados de longo prazo',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'efficiency',
    title: 'Eficiência Operacional',
    description: 'Reduza o tempo gasto em agendamento administrativo',
    icon: <Zap className="w-5 h-5" />,
  },
]

const DEFAULT_PAIN_POINTS: PainPoint[] = [
  {
    id: 'no-shows',
    title: 'Pacientes que não comparecem',
    description: 'Agendamentos perdidos afetando receita',
    icon: <CalendarX className="w-5 h-5" />,
    selected: true,
  },
  {
    id: 'follow-ups',
    title: 'Acompanhamentos Manuais',
    description: 'A equipe gasta horas no WhatsApp/Telefone',
    icon: <Phone className="w-5 h-5" />,
    selected: false,
  },
  {
    id: 'conflicts',
    title: 'Conflitos de Agendamento',
    description: 'Agendamentos duplos ou problemas de sincronização de calendário',
    icon: <Calendar className="w-5 h-5" />,
    selected: false,
  },
  {
    id: 'intake',
    title: 'Fricção na Admissão',
    description: 'Processo lento para integração de novos pacientes',
    icon: <UserPlus className="w-5 h-5" />,
    selected: false,
  },
]

export function ObjectivesTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  // State
  const [priorities, setPriorities] = useState<Priority[]>(DEFAULT_PRIORITIES)
  const [painPoints, setPainPoints] = useState<PainPoint[]>(DEFAULT_PAIN_POINTS)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  // Queries & Mutations
  const { data: savedData, isLoading: isLoadingData } = useClinicObjectives(clinicId)
  const { mutate: saveObjectives, isPending: isSaving } = useSaveClinicObjectives(clinicId)

  // Load saved data when component mounts or data changes
  useEffect(() => {
    if (savedData) {
      setPriorities(savedData.priorities.length > 0 ? savedData.priorities : DEFAULT_PRIORITIES)
      setPainPoints(savedData.painPoints.length > 0 ? savedData.painPoints : DEFAULT_PAIN_POINTS)
      setAdditionalNotes(savedData.additionalNotes || '')
    }
  }, [savedData])

  // Drag handlers
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

  // Pain point toggle
  const togglePainPoint = (id: string) => {
    setPainPoints(points =>
      points.map(point =>
        point.id === id ? { ...point, selected: !point.selected } : point
      )
    )
  }

  // Save handler
  const handleSave = async () => {
    saveObjectives({
      priorities,
      painPoints,
      additionalNotes,
    })
  }

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="space-y-4 flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        <span className="text-muted-foreground">Carregando configurações...</span>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Rank Priorities Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Classifique suas prioridades
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste itens para reordenar por importância
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
                draggedItem === index ? 'opacity-50 scale-[0.98]' : ''
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
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Pontos de dor operacional
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione os gargalos que Carol deve resolver primeiro
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {painPoints.map((point) => (
            <button
              key={point.id}
              onClick={() => togglePainPoint(point.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                point.selected
                  ? 'border-pink-300 bg-pink-50'
                  : 'border-border bg-white hover:border-pink-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                point.selected ? 'bg-pink-100 text-pink-500' : 'bg-gray-100 text-muted-foreground'
              }`}>
                {point.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                point.selected ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
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
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Tem mais algo que devemos saber?
        </h2>
        <Textarea
          placeholder="Nos diga mais sobre sua rotina diária ou desafios específicos..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          className="min-h-[100px] resize-none"
        />
      </section>

      {/* Save Button */}
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
