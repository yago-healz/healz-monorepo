import { useState, useEffect } from 'react'
import { Plus, Briefcase, X, Loader2, Trash2 } from 'lucide-react'
import { SettingsLoading } from './settings-loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClinicServices, useSaveClinicServices } from '@/features/clinic/api/clinic-settings.api'
import { tokenService } from '@/services/token.service'
import type { Service } from '@/types/onboarding'

export function ServicesTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  const [services, setServices] = useState<Service[]>([])
  const [expandedNotes, setExpandedNotes] = useState<string[]>([])

  const { data: savedData, isLoading: isLoadingData } = useClinicServices(clinicId)
  const { mutate: saveServices, isPending: isSaving } = useSaveClinicServices(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData?.services !== undefined) {
      setServices(savedData.services)
      setExpandedNotes(savedData.services.filter(s => s.note).map(s => s.id))
    }
  }, [savedData])

  const updateService = (id: string, field: keyof Service, value: string) => {
    setServices(services.map(service =>
      service.id === id ? { ...service, [field]: value } : service
    ))
  }

  const addService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      duration: '30',
      value: '0.00',
    }
    setServices(prev => [...prev, newService])
  }

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
    setExpandedNotes(prev => prev.filter(noteId => noteId !== id))
  }

  const toggleNotes = (id: string) => {
    if (!expandedNotes.includes(id)) {
      setServices(prev =>
        prev.map(s => s.id === id && s.note === undefined ? { ...s, note: '' } : s)
      )
    }
    setExpandedNotes(prev =>
      prev.includes(id)
        ? prev.filter(noteId => noteId !== id)
        : [...prev, id]
    )
  }

  const removeNote = (id: string) => {
    setExpandedNotes(prev => prev.filter(noteId => noteId !== id))
    updateService(id, 'note', '')
  }

  const handleSave = async () => {
    saveServices({ services })
  }

  if (isLoadingData) {
    return <SettingsLoading message="Carregando serviços..." />
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Serviços e Procedimentos
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={addService}>
            <Plus className="w-4 h-4 mr-2" />
            Novo serviço
          </Button>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre o primeiro serviço ou procedimento da clínica.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={addService}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar serviço
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-border p-6"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Input
                        value={service.title}
                        onChange={(e) => updateService(service.id, 'title', e.target.value)}
                        placeholder="Nome do serviço ou procedimento"
                        className="font-semibold mb-2"
                      />
                      <Input
                        value={service.description}
                        onChange={(e) => updateService(service.id, 'description', e.target.value)}
                        placeholder="Descrição breve"
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                    <button
                      onClick={() => removeService(service.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remover serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Duração (min)
                      </label>
                      <Select
                        value={service.duration}
                        onValueChange={(value) => updateService(service.id, 'duration', value)}
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
                        Valor (R$)
                      </label>
                      <Input
                        type="text"
                        value={service.value}
                        onChange={(e) => updateService(service.id, 'value', e.target.value)}
                        className="w-32 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {expandedNotes.includes(service.id) ? (
                  <div className="mt-4 p-4 bg-pink-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-pink-500 uppercase tracking-wide">
                        Nota para Carol:
                      </p>
                      <button
                        onClick={() => removeNote(service.id)}
                        className="text-pink-400 hover:text-pink-600 transition-colors"
                        aria-label="Excluir nota"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={service.note ?? ''}
                      onChange={(e) => updateService(service.id, 'note', e.target.value)}
                      className="w-full text-sm text-foreground bg-transparent focus:outline-none resize-none"
                      rows={2}
                      placeholder="Adicione instruções ou observações para Carol..."
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => toggleNotes(service.id)}
                    className="mt-4 flex items-center gap-1 text-pink-500 text-sm hover:text-pink-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar notas internas para Carol
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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
          'Salvar'
        )}
      </Button>
    </div>
  )
}
