import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useClinicScheduling, useSaveClinicScheduling } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'
import type { DayOfWeek, DaySchedule, SchedulingRules, SpecificBlock } from '@/types/onboarding'
import { AlertCircle, Calendar, Clock, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SettingsLoading } from './settings-loading'

const DAYS_OF_WEEK: { day: DayOfWeek; label: string }[] = [
  { day: 'monday', label: 'Segunda-feira' },
  { day: 'tuesday', label: 'Terça-feira' },
  { day: 'wednesday', label: 'Quarta-feira' },
  { day: 'thursday', label: 'Quinta-feira' },
  { day: 'friday', label: 'Sexta-feira' },
  { day: 'saturday', label: 'Sábado' },
  { day: 'sunday', label: 'Domingo' },
]

const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = DAYS_OF_WEEK.map((d, idx) => ({
  day: d.day,
  isOpen: idx < 5, // Mon-Fri open by default
  timeSlots: idx < 5 ? [{ id: '1', from: '08:00', to: '18:00' }] : [],
}))

// ============ DayRow Component ============
interface DayRowProps {
  label: string
  schedule: DaySchedule
  onToggleOpen: () => void
  onAddSlot: () => void
  onRemoveSlot: (slotId: string) => void
  onUpdateSlot: (slotId: string, field: 'from' | 'to', value: string) => void
}

function DayRow({ label, schedule, onToggleOpen, onAddSlot, onRemoveSlot, onUpdateSlot }: DayRowProps) {
  return (
    <div className="border-b border-border last:border-b-0 py-4 last:pb-0">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-foreground">{label}</span>
        <Switch checked={schedule.isOpen} onCheckedChange={onToggleOpen} />
      </div>

      {!schedule.isOpen ? (
        <p className="text-sm text-muted-foreground italic">(Dia fechado)</p>
      ) : (
        <div className="space-y-2 ml-4">
          {schedule.timeSlots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-2">
              <Input
                type="time"
                value={slot.from}
                onChange={(e) => onUpdateSlot(slot.id, 'from', e.target.value)}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">às</span>
              <Input
                type="time"
                value={slot.to}
                onChange={(e) => onUpdateSlot(slot.id, 'to', e.target.value)}
                className="w-20"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSlot(slot.id)}
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}

          <button
            onClick={onAddSlot}
            className="flex items-center gap-1 text-pink-500 text-xs hover:text-pink-600 transition-colors mt-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar horário
          </button>
        </div>
      )}
    </div>
  )
}

// ============ Main Component ============
export function SchedulingTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  // State for scheduling rules
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_WEEKLY_SCHEDULE)
  const [defaultAppointmentDuration, setDefaultAppointmentDuration] = useState(30)
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(0)
  const [maxFutureDays, setMaxFutureDays] = useState(365)
  const [specificBlocks, setSpecificBlocks] = useState<SpecificBlock[]>([])

  // State for specific block form
  const [showAddBlockForm, setShowAddBlockForm] = useState(false)
  const [newBlockDate, setNewBlockDate] = useState('')
  const [newBlockFrom, setNewBlockFrom] = useState('12:00')
  const [newBlockTo, setNewBlockTo] = useState('13:00')
  const [newBlockReason, setNewBlockReason] = useState('')

  // API hooks
  const { data: savedData, isLoading: isLoadingData } = useClinicScheduling(clinicId)
  const { mutate: saveScheduling, isPending: isSaving } = useSaveClinicScheduling(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData) {
      setWeeklySchedule(
        savedData.weeklySchedule?.length > 0 ? savedData.weeklySchedule : DEFAULT_WEEKLY_SCHEDULE
      )
      setDefaultAppointmentDuration(savedData.defaultAppointmentDuration ?? 30)
      setMinimumAdvanceHours(savedData.minimumAdvanceHours ?? 0)
      setMaxFutureDays(savedData.maxFutureDays ?? 365)
      setSpecificBlocks(savedData.specificBlocks ?? [])
    }
  }, [savedData])

  // ============ Handlers: Weekly Schedule ============
  const handleToggleDayOpen = (day: DayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === day) {
          return { ...d, isOpen: !d.isOpen, timeSlots: !d.isOpen ? [{ id: '1', from: '08:00', to: '18:00' }] : [] }
        }
        return d
      })
    )
  }

  const handleAddTimeSlot = (day: DayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === day) {
          return {
            ...d,
            timeSlots: [...d.timeSlots, { id: Date.now().toString(), from: '09:00', to: '10:00' }],
          }
        }
        return d
      })
    )
  }

  const handleRemoveTimeSlot = (day: DayOfWeek, slotId: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === day) {
          return { ...d, timeSlots: d.timeSlots.filter((s) => s.id !== slotId) }
        }
        return d
      })
    )
  }

  const handleUpdateTimeSlot = (day: DayOfWeek, slotId: string, field: 'from' | 'to', value: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === day) {
          return {
            ...d,
            timeSlots: d.timeSlots.map((s) => (s.id === slotId ? { ...s, [field]: value } : s)),
          }
        }
        return d
      })
    )
  }

  // ============ Handlers: Specific Blocks ============
  const handleAddSpecificBlock = () => {
    if (!newBlockDate || !newBlockFrom || !newBlockTo) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    const newBlock: SpecificBlock = {
      id: Date.now().toString(),
      date: newBlockDate,
      from: newBlockFrom,
      to: newBlockTo,
      reason: newBlockReason || undefined,
    }

    setSpecificBlocks([...specificBlocks, newBlock])
    setShowAddBlockForm(false)
    setNewBlockDate('')
    setNewBlockFrom('12:00')
    setNewBlockTo('13:00')
    setNewBlockReason('')
  }

  const handleRemoveSpecificBlock = (id: string) => {
    setSpecificBlocks(specificBlocks.filter((b) => b.id !== id))
  }

  // ============ Save ============
  const handleSave = () => {
    const payload: SchedulingRules = {
      weeklySchedule,
      defaultAppointmentDuration,
      minimumAdvanceHours,
      maxFutureDays,
      specificBlocks,
    }
    saveScheduling(payload)
  }

  if (isLoadingData) {
    return <SettingsLoading />
  }

  return (
    <div className="space-y-6">
      {/* ============ SECTION 1: Horário de Funcionamento ============ */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <CardTitle className="text-base">Horário de Funcionamento</CardTitle>
          </div>
          <CardDescription>Configure a disponibilidade por dia da semana</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {weeklySchedule.map((daySchedule) => {
              const dayInfo = DAYS_OF_WEEK.find((d) => d.day === daySchedule.day)!
              return (
                <DayRow
                  key={daySchedule.day}
                  label={dayInfo.label}
                  schedule={daySchedule}
                  onToggleOpen={() => handleToggleDayOpen(daySchedule.day)}
                  onAddSlot={() => handleAddTimeSlot(daySchedule.day)}
                  onRemoveSlot={(slotId) => handleRemoveTimeSlot(daySchedule.day, slotId)}
                  onUpdateSlot={(slotId, field, value) => handleUpdateTimeSlot(daySchedule.day, slotId, field, value)}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ============ SECTION 2: Regras de Agendamento ============ */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <CardTitle className="text-base">Regras de Agendamento</CardTitle>
          </div>
          <CardDescription>Configure os parâmetros gerais de agendamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Clock className="w-4 h-4 inline mr-2 text-muted-foreground" />
                Duração Padrão (min)
              </label>
              <Input
                type="number"
                min="15"
                step="15"
                value={defaultAppointmentDuration}
                onChange={(e) => setDefaultAppointmentDuration(Math.max(15, parseInt(e.target.value) || 15))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Tempo padrão para cada consulta</p>
            </div>

            {/* Advance Hours */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <AlertCircle className="w-4 h-4 inline mr-2 text-muted-foreground" />
                Antecedência Mínima (h)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={minimumAdvanceHours}
                onChange={(e) => setMinimumAdvanceHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Horas mínimas antes de agendar</p>
            </div>

            {/* Max Future Days */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-2 text-muted-foreground" />
                Máx. Dias no Futuro
              </label>
              <Input
                type="number"
                min="1"
                step="10"
                value={maxFutureDays}
                onChange={(e) => setMaxFutureDays(Math.max(1, parseInt(e.target.value) || 365))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Até quantos dias agendar</p>
            </div>

            {/* Placeholder for balance */}
            <div className="opacity-0 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {/* ============ SECTION 3: Bloqueios Específicos ============ */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <CardTitle className="text-base">Bloqueios Específicos</CardTitle>
          </div>
          <CardDescription>Bloqueie períodos pontuais (feriados, reuniões, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Block Form */}
          {!showAddBlockForm ? (
            <Button
              variant="outline"
              onClick={() => setShowAddBlockForm(true)}
              className="w-full justify-start text-pink-500 border-pink-200 hover:bg-pink-50 hover:text-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Bloquear período
            </Button>
          ) : (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
                  <Input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">De</label>
                  <Input
                    type="time"
                    value={newBlockFrom}
                    onChange={(e) => setNewBlockFrom(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Até</label>
                  <Input
                    type="time"
                    value={newBlockTo}
                    onChange={(e) => setNewBlockTo(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo (opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: Reunião, Feriado, Manutenção..."
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  className="h-8"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddBlockForm(false)
                    setNewBlockDate('')
                    setNewBlockFrom('12:00')
                    setNewBlockTo('13:00')
                    setNewBlockReason('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  onClick={handleAddSpecificBlock}
                >
                  Adicionar Bloqueio
                </Button>
              </div>
            </div>
          )}

          {/* Blocks List */}
          {specificBlocks.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-foreground mb-3">Bloqueios configurados:</p>
              {specificBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {new Date(block.date).toLocaleDateString('pt-BR')} de {block.from} a {block.to}
                    </p>
                    {block.reason && <p className="text-xs text-muted-foreground">{block.reason}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSpecificBlock(block.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-linear-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
    </div>
  )
}
