# Tarefa 02 — `EvolutionApiService`

**Objetivo:** Criar o serviço que encapsula todas as chamadas HTTP à Evolution API.

---

## Arquivo a criar

`apps/api/src/modules/evolution-api/evolution-api.service.ts`

---

## Dependências

- `axios` (já disponível no projeto)
- Tabela `clinicWhatsappCredentials` (tarefa 01)
- Variáveis de ambiente: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `API_PUBLIC_URL`

---

## Interface pública do serviço

```typescript
@Injectable()
export class EvolutionApiService {

  // Retorna URL base e headers padrão (global key)
  private get baseUrl(): string
  private get globalHeaders(): Record<string, string>

  // Cria uma nova instância na Evolution API para a clínica.
  // Configura webhook para os eventos: QRCODE_UPDATED, CONNECTION_UPDATE, MESSAGES_UPSERT
  // Salva registro em clinic_whatsapp_credentials com status='connecting'
  // Retorna o primeiro QR code base64 (já vem na resposta do create)
  async createInstance(clinicId: string): Promise<{ qrCode: string; instanceName: string; instanceToken: string }>

  // Busca o QR code atual para uma instância no estado 'connecting'.
  // Chama GET /instance/connect/{instanceName} na Evolution API.
  // Retorna base64 do QR ou null se já conectado.
  async getQrCode(instanceName: string, instanceToken: string): Promise<string | null>

  // Retorna o estado atual da instância: 'open' | 'connecting' | 'close' | 'qr'
  async getConnectionState(instanceName: string, instanceToken: string): Promise<string>

  // Envia mensagem de texto via WhatsApp.
  // number: número do destinatário com DDI (ex: "5511999999999")
  async sendText(instanceName: string, instanceToken: string, number: string, text: string): Promise<void>

  // Desconecta (logout) e deleta a instância na Evolution API.
  // Atualiza registro no banco para status='disconnected', limpa QR e phoneNumber.
  async disconnectInstance(clinicId: string): Promise<void>

  // Retorna as credenciais salvas no banco para uma clínica.
  async getCredentials(clinicId: string): Promise<typeof clinicWhatsappCredentials.$inferSelect | null>

  // Retorna as credenciais pelo instanceName (usado pelo webhook handler).
  async getCredentialsByInstanceName(instanceName: string): Promise<typeof clinicWhatsappCredentials.$inferSelect | null>

  // Atualiza status e/ou QR code no banco.
  async updateStatus(clinicId: string, status: string, extraFields?: { lastQrCode?: string | null; phoneNumber?: string; connectedAt?: Date }): Promise<void>
}
```

---

## Detalhes de implementação

### `createInstance(clinicId)`

1. Verificar se já existe credencial ativa no banco para esta clínica
   - Se status = 'connected': lançar erro "Clínica já possui WhatsApp conectado"
   - Se existe mas desconectada: deletar instância antiga na Evolution API antes de recriar

2. Gerar `instanceName = \`clinic-${clinicId}\``
3. Gerar `instanceToken = randomUUID()`
4. Calcular webhook URL: `\`${process.env.API_PUBLIC_URL}/api/v1/webhooks/whatsapp\``
5. Chamar `POST /instance/create` com body:
   ```json
   {
     "instanceName": "clinic-{clinicId}",
     "token": "{instanceToken}",
     "qrcode": true,
     "integration": "WHATSAPP-BAILEYS",
     "groupsIgnore": true,
     "rejectCall": false,
     "readMessages": false,
     "webhook": {
       "enabled": true,
       "url": "{webhookUrl}",
       "byEvents": false,
       "events": ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"]
     }
   }
   ```
6. Upsert em `clinic_whatsapp_credentials` com status='connecting'
7. Retornar `{ qrCode: response.qrcode.base64, instanceName, instanceToken }`

### `disconnectInstance(clinicId)`

1. Buscar credenciais no banco
2. Chamar `DELETE /instance/logout/{instanceName}` (só logout, mantém instância para debug)
   - ou `DELETE /instance/delete/{instanceName}` para remover completamente
3. Atualizar banco: `status='disconnected'`, `lastQrCode=null`, `phoneNumber=null`, `connectedAt=null`

### Tratamento de erros

- Erros HTTP da Evolution API: logar e lançar `InternalServerErrorException` com mensagem amigável
- Instância não encontrada na Evolution API (404): tratar como desconectada

---

## Critério de conclusão

- Serviço compila sem erros TypeScript
- `createInstance` retorna QR code base64 válido (testável manualmente com a Evolution API)
- `disconnectInstance` remove/desconecta a instância
- `sendText` envia mensagem de teste
