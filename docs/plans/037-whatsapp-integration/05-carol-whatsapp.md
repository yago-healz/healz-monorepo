# Tarefa 05 — Integração Carol ↔ WhatsApp

**Objetivo:** Processar mensagens recebidas via WhatsApp pela Carol e enviar a resposta de volta ao paciente.

---

## Arquivo a criar

`apps/api/src/modules/evolution-api/evolution-carol.handler.ts`

---

## Responsabilidade

Este handler é o "conector" entre o webhook do WhatsApp e o `CarolChatService`. Ele é chamado pelo `EvolutionApiWebhookController` (tarefa 04) para cada mensagem de texto recebida de um paciente.

---

## Interface

```typescript
@Injectable()
export class EvolutionCarolHandler {
  constructor(
    private readonly carolChatService: CarolChatService,
    private readonly evolutionApiService: EvolutionApiService,
  )

  // Processa uma mensagem recebida de um paciente via WhatsApp.
  // clinicId: UUID da clínica dona da instância
  // remoteJid: JID completo do remetente (ex: "5511999999999@s.whatsapp.net")
  // messageText: conteúdo da mensagem
  async handle(clinicId: string, remoteJid: string, messageText: string): Promise<void>
}
```

---

## Lógica do `handle()`

```
1. Obter número limpo: phoneNumber = remoteJid.replace('@s.whatsapp.net', '')

2. Usar remoteJid como sessionId da conversa com Carol
   (garante contexto contínuo por número de telefone)

3. Chamar CarolChatService.processMessage(clinicId, {
     message: messageText,
     sessionId: remoteJid,   // persistência da sessão por número
     version: 'published',   // sempre usa configuração publicada
   })

4. Se CarolChatService retornar erro ou Carol não configurada:
   - Logar o erro
   - NÃO enviar nada ao paciente (silêncio é melhor que mensagem de erro técnico)

5. Enviar resposta:
   - Buscar credenciais da clínica: { instanceName, instanceToken }
   - Chamar evolutionApiService.sendText(instanceName, instanceToken, phoneNumber, reply)

6. Se sendText falhar: logar erro, não propagar (não queremos derrubar o webhook)
```

---

## Considerações sobre sessão

O `CarolChatService` mantém sessões em memória (`Map<sessionId, messages>`). Usando `remoteJid` como `sessionId`, cada número de telefone tem seu próprio histórico de conversa com a Carol — exatamente o comportamento esperado.

**Limitação atual (aceitável para MVP):** o histórico é perdido ao reiniciar o servidor. Isso é o mesmo comportamento do playground — pode ser endereçado em fase futura com persistência em banco.

---

## Tratamento de Carol não publicada

`CarolChatService.processMessage()` retorna `{ reply: 'Carol ainda não foi configurada para esta clínica.' }` se não há config publicada. Neste caso, o handler deve **silenciar** (não enviar esta mensagem técnica ao paciente). Verificar o texto da resposta para detectar este caso, ou adicionar um campo `configured: boolean` ao `ChatResponseDto`.

Opção mais limpa: antes de chamar `processMessage`, verificar se existe config publicada via `carolConfigService.getConfigByVersion(clinicId, 'published')`. Se null, silenciar.

---

## Critério de conclusão

- Mensagem de texto de paciente via WhatsApp → Carol recebe, processa e responde
- Histórico de conversa mantido entre mensagens do mesmo número
- Erros não propagam (webhook sempre retorna 200)
- Clínica sem Carol publicada: silêncio (nenhuma mensagem enviada)
