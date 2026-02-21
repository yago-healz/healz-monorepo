# Task 07 — Conectar Aba de Carol

**Objetivo:** Integrar Carol Tab com a API, permitindo salvar e restaurar personalidade, greeting e configurações do assistente.

---

## 📁 Arquivo Afetado

### Modificar
- `apps/web/src/features/clinic/components/settings/tabs/carol-tab.tsx`

---

## Implementação

Substituir o componente `CarolTab` para:

```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MessageSquare, Ban, GitBranch, Heart, Loader2 } from 'lucide-react'
import { PERSONALITY_TRAITS } from '@/types/onboarding'
import { useClinicCarolSettings, useSaveClinicCarolSettings } from '@/features/clinic/api/clinic-settings.api'
import { useParams } from '@tanstack/react-router'

const DEFAULT_GREETING =
  "Olá! Sou a Carol, sua assistente virtual. Estou aqui para ajudá-lo a agendar consultas, responder perguntas sobre nossos serviços ou encaminhá-lo para um especialista. Como posso ajudá-lo hoje?"

export function CarolTab() {
  const { clinicId } = useParams({ from: '/clinic/settings' })

  const [selectedTraits, setSelectedTraits] = useState<string[]>(['welcoming', 'empathetic'])
  const [greeting, setGreeting] = useState(DEFAULT_GREETING)
  const [restrictSensitiveTopics, setRestrictSensitiveTopics] = useState(true)

  const { data: savedData, isLoading: isLoadingData } = useClinicCarolSettings(clinicId)
  const { mutate: saveCarolSettings, isPending: isSaving } = useSaveClinicCarolSettings(clinicId)

  // Load saved data
  useEffect(() => {
    if (savedData) {
      setSelectedTraits(savedData.selectedTraits.length > 0 ? savedData.selectedTraits : ['welcoming', 'empathetic'])
      setGreeting(savedData.greeting || DEFAULT_GREETING)
      setRestrictSensitiveTopics(savedData.restrictSensitiveTopics)
    }
  }, [savedData])

  const toggleTrait = (traitId: string) => {
    setSelectedTraits((prev) =>
      prev.includes(traitId) ? prev.filter((t) => t !== traitId) : [...prev, traitId]
    )
  }

  const handleSave = async () => {
    saveCarolSettings({
      selectedTraits,
      greeting,
      restrictSensitiveTopics,
    })
  }

  if (isLoadingData) {
    return (
      <div className="space-y-4 flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        <span className="text-muted-foreground">Carregando configurações...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personality Section */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-500" />
            <h2 className="font-semibold text-foreground">Personalidade</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione os adjetivos que melhor descrevem como Carol deve falar com os pacientes.
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
            <h2 className="font-semibold text-foreground">Saudação Inicial</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Como Carol se apresenta
          </p>
          <div className="bg-gray-100 rounded-lg p-4">
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="min-h-24 bg-transparent border-none resize-none focus-visible:ring-0 text-foreground"
              placeholder="Digite a mensagem de saudação de Carol..."
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
                <h3 className="font-semibold text-foreground">Restringir Tópicos Sensíveis</h3>
                <p className="text-sm text-muted-foreground">
                  Carol deve evitar discutir diagnósticos médicos ou faturamento?
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
              <h3 className="font-semibold text-foreground">Regras de Roteamento</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Defina quando Carol deve transferir para um agente humano
            </p>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-foreground font-medium mb-2">
                Transferir para um agente humano se:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>O paciente expressa altos níveis de angústia.</li>
                <li>Menciona especificamente uma emergência médica urgente.</li>
                <li>Pede um operador humano mais de duas vezes.</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

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

1. **Import hooks:** `useClinicCarolSettings`, `useSaveClinicCarolSettings`
2. **Load data:** Carrega traços de personalidade, greeting e configuração de tópicos sensíveis
3. **Personality traits:** Toggle múltiplo de traços
4. **Greeting editor:** Campo editável para customizar saudação inicial
5. **Sensitive topics switch:** Toggle para ativar/desativar restrições
6. **Save:** Envia selectedTraits, greeting e restrictSensitiveTopics para API

---

## ✅ Critério de Sucesso

- [ ] Dados salvos aparecem ao carregar
- [ ] Pode selecionar/desselecionar traços de personalidade
- [ ] Pode editar greeting
- [ ] Toggle de tópicos sensíveis funciona
- [ ] Salvar persiste os dados
