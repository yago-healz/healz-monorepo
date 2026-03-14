# 07 — Sidebar e Navegação

**Objetivo:** Adicionar "Médicos" ao sidebar da clínica e garantir que todas as novas rotas são acessíveis.

**Depende de:** 04 (rota de doctors existe)

---

## Arquivos a modificar

### `apps/web/src/components/layout/clinic-sidebar.tsx`

Adicionar item "Médicos" no grupo "Principal" do sidebar, após "Membros":

```typescript
{
  title: 'Médicos',
  href: '/clinic/doctors',
  icon: Stethoscope,  // import de lucide-react
}
```

**Posição no array:** Entre "Membros" e "Agenda" no grupo Principal.

---

## Critérios de aceite

- [ ] Item "Médicos" visível no sidebar com ícone Stethoscope
- [ ] Link navega para `/clinic/doctors`
- [ ] Item aparece com estado ativo quando na rota `/clinic/doctors` ou `/clinic/doctors/:id`
