# Tarefa 05 — Limpeza de código obsoleto

**Objetivo:** Remover arquivos e rotas que foram substituídos pela nova página unificada.

---

## Arquivos a deletar

| Arquivo | Motivo |
|---|---|
| `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx` | Rota obsoleta — `/clinic/carol/settings` não existe mais |
| `apps/web/src/features/carol/components/carol-page.tsx` | Substituído por `UnifiedSettingsPage` + `CarolTab` |
| `apps/web/src/features/carol/components/carol-settings-page.tsx` | Dead code — não é importado por nenhum arquivo ativo |
| `apps/web/src/features/carol/components/carol-settings-form.tsx` | Lógica migrada para `identity-subtab.tsx` + `behavior-subtab.tsx` |

## Componentes que permanecem

| Arquivo | Status |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/objectives-tab.tsx` | Mantido — usado pelo `clinic-context-subtab.tsx` |
| `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx` | **Deletar** — substituído por `clinica-tab.tsx` |
| `apps/web/src/features/carol/components/carol-chat-panel.tsx` | Mantido — usado pelo `carol-tab.tsx` |
| `apps/web/src/features/carol/components/chat-message.tsx` | Mantido — usado pelo `carol-chat-panel.tsx` |

> **Nota:** `clinic-settings-page.tsx` também pode ser deletado se `ClinicaTab` substitui sua função integralmente.

## Ajustes no sidebar / navegação

Verificar se o menu lateral (`app-sidebar.tsx`) tem link apontando para `/clinic/carol/settings`. Se existir:
- Remover o item separado de Carol
- Manter apenas o item "Configurações" apontando para `/clinic/settings?mainTab=carol`

Verificar arquivo: `apps/web/src/components/layout/app-sidebar.tsx`

## Critério de conclusão

- `pnpm exec tsc --noEmit` no diretório `apps/web` sem erros
- Nenhum import aponta para arquivos deletados
- Navegação lateral funciona corretamente
- Rota `/clinic/carol/settings` retorna 404 ou redireciona (Tanstack Router trata automaticamente)
