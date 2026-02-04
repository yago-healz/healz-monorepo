import { useState, useEffect } from "react"
import { useNavigate } from '@tanstack/react-router'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sparkles, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function OnboardingStep5() {
  const navigate = useNavigate()
  const { data, updateStep5 } = useOnboarding()

  const [formData, setFormData] = useState({
    inboxName: "",
    phoneNumber: "",
    businessAccountId: "",
    appId: "",
    apiToken: "",
  })

  // Load data from context on mount
  useEffect(() => {
    if (data.step5.inboxName) {
      setFormData(data.step5)
    }
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleContinue = () => {
    // Save data to context
    updateStep5(formData)
    // Navigate to review
    navigate({ to: '/onboarding/review' })
  }

  const handleBack = () => {
    navigate({ to: '/onboarding/step-4' })
  }

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
            <span className="text-sm text-muted-foreground">Sair do Setup</span>
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-teal-500 text-white text-xs">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-73px)]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-pink-500 uppercase">
                Etapa 5 de 5
              </span>
              <span className="text-sm font-semibold text-foreground">95% Concluido</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: "95%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Configuracao Final do Agente
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-500">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Nao Conectado
            </span>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Conecte a Carol ao WhatsApp
            </h1>
            <p className="text-pink-500 font-medium">
              Sem o WhatsApp conectado, a Carol nao podera operar.
            </p>
          </div>

          {/* Connection Form Card */}
          <Card className="mb-6 border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              {/* Inbox Name */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Nome da Caixa de Entrada
                </label>
                <Input
                  placeholder="ex: Suporte Geral"
                  value={formData.inboxName}
                  onChange={(e) => handleChange("inboxName", e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Numero de Telefone
                </label>
                <Input
                  placeholder="+55 (11) 99999-9999"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Business Account ID & App ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="text-sm font-medium text-foreground">
                      ID da Conta de Negocios
                    </label>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="ID da Meta Business"
                    value={formData.businessAccountId}
                    onChange={(e) => handleChange("businessAccountId", e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="text-sm font-medium text-foreground">ID do Aplicativo</label>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="App ID"
                    value={formData.appId}
                    onChange={(e) => handleChange("appId", e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* API Token */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-foreground">Token de API / API Key</label>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  placeholder="EAA..."
                  value={formData.apiToken}
                  onChange={(e) => handleChange("apiToken", e.target.value)}
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Conectar via Meta
            </Button>
            <Button
              variant="outline"
              onClick={handleBack}
              className="w-full py-6 border-border text-foreground hover:bg-gray-50 bg-transparent"
            >
              Configurar mais tarde
            </Button>
          </div>

          {/* Help Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Precisa de ajuda?{" "}
            <a href="#" className="text-pink-500 hover:underline">
              Veja o guia de conexao
            </a>
          </p>

          {/* Footer */}
          <footer className="text-center text-sm text-muted-foreground mt-12">
            &copy; 2024 Carol AI. Uma solucao Patient Journey SaaS.
          </footer>
        </div>
      </main>
    </div>
  )
}
