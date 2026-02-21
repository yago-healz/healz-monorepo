# Task 05 — Conectar Aba de Serviços

**Objetivo:** Integrar Services Tab com a API, permitindo salvar e restaurar serviços/procedimentos.

---

## 📁 Arquivo Afetado

### Modificar
- `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx`

---

## Implementação

Substituir o componente `ServicesTab` para:

```typescript
import { useState, useEffect } from 'react'
import { Plus, Briefcase, Loader2 } from 'lucide-react'
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
import { useParams } from '@tanstack/react-router'
import type { Service } from '@/types/onboarding'

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'initial',
    title: 'Consulta Inicial',
    description: 'Primeiro contato com novos pacientes',
    duration: '45',
    value: '350.00',
  },
  {
    id: 'return',
    title: 'Retorno',
    description: 'Acompanhamento em até 30 dias',
    duration: '20',
    value: '0.00',
  },
  {
    id: 'procedures',
    title: 'Procedimentos',
    description: 'Exames e pequenas intervenções',
    duration: '120',
    value: '800.00',
    note: 'Os pacientes devem ser aconselhados a chegar 15 minutos mais cedo para preencher formulários.',
  },
]

export function ServicesTab() {
  const { clinicId } = useParams({ from: '/clinic/settings' })

  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [expandedNotes, setExpandedNotes] = useState<string[]>(['procedures'])

  const { data: savedData, isLoading: isLoadingData } = useClinicServices(clinicId)
  const { mutate: saveServices, isPending: isSaving } = useSaveClinicServices(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData?.services && savedData.services.length > 0) {
      setServices(savedData.services)
    }
  }, [savedData])

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

  const handleSave = async () => {
    saveServices({ services })
  }

  if (isLoadingData) {
    return (
      <div className="space-y-4 flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        <span className="text-muted-foreground">Carregando serviços...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Serviços e Procedimentos
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

              {expandedNotes.includes(service.id) && service.note ? (
                <div className="mt-4 p-4 bg-pink-50 rounded-lg">
                  <p className="text-xs text-pink-500 uppercase tracking-wide mb-1">
                    Nota para Carol:
                  </p>
                  <textarea
                    value={service.note}
                    onChange={(e) => updateService(service.id, 'note', e.target.value)}
                    className="w-full text-sm text-foreground bg-transparent focus:outline-none resize-none"
                    rows={2}
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
      </section>

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
```

---

## 🎯 Modificações Principais

1. **Import hooks:** `useClinicServices`, `useSaveClinicServices`
2. **Load data:** Carrega serviços salvos ou mostra defaults
3. **Update logic:** `updateService` modifica campo do serviço
4. **Notes editor:** Campo editável para notas do Carol
5. **Save:** `handleSave` envia todos os serviços para API

---

## ✅ Critério de Sucesso

- [ ] Componente renderiza com dados salvos (ou defaults)
- [ ] Pode editar duração, valor e notas
- [ ] Salvar persiste os dados
- [ ] Ao voltar, dados aparecem novamente
