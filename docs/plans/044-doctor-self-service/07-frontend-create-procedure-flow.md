# 07 — Frontend: Dialog "Criar Procedimento" na Tab de Procedimentos

**Objetivo:** Quando doctor esta na self-view, ele pode criar um novo procedimento que e automaticamente adicionado ao catalogo da clinica e vinculado a ele.

**Depende de:** 04 (backend endpoint), 06 (frontend base)

## Arquivos

**Modificar:**
- `apps/web/src/features/clinic/components/doctors/doctor-procedures-tab.tsx`

## Implementacao

### Novo componente interno: CreateProcedureDialog

Adicionar dentro do arquivo `doctor-procedures-tab.tsx` (mesmo padrao dos outros dialogs existentes):

```typescript
interface CreateProcedureDialogProps {
  clinicId: string
  doctorId: string
  open: boolean
  onClose: () => void
}

function CreateProcedureDialog({ clinicId, doctorId, open, onClose }: CreateProcedureDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [defaultDuration, setDefaultDuration] = useState('30')
  const [price, setPrice] = useState('')

  const { mutate: createAndLink, isPending } = useCreateAndLinkProcedure(clinicId, doctorId)

  function handleSubmit() {
    if (!name.trim()) return
    createAndLink(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        defaultDuration: parseInt(defaultDuration) || 30,
        price: price ? Math.round(parseFloat(price) * 100) : undefined,
      },
      {
        onSuccess: () => {
          resetForm()
          onClose()
        },
      },
    )
  }

  function resetForm() {
    setName('')
    setDescription('')
    setCategory('')
    setDefaultDuration('30')
    setPrice('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Procedimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Consulta Inicial"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Descricao</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao do procedimento..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Consulta"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Duracao padrao (min) *</Label>
              <Input
                type="number"
                min="5"
                max="480"
                step="5"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preco (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Deixe em branco para definir depois"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Integrar no DoctorProceduresTab

No componente principal, adicionar o botao e dialog:

```diff
 export function DoctorProceduresTab({ doctorId, isSelfView = false }: DoctorProceduresTabProps) {
   const clinicId = tokenService.getActiveClinicId() ?? ''
   // ... existing state ...
+  const [showCreate, setShowCreate] = useState(false)

   return (
     <div className="space-y-4">
       <div className="flex justify-end gap-2">
+        {isSelfView && (
+          <Button
+            onClick={() => setShowCreate(true)}
+            variant="outline"
+            size="sm"
+          >
+            <Plus className="w-4 h-4 mr-2" />
+            Criar Procedimento
+          </Button>
+        )}
         <Button onClick={() => setShowLink(true)} /* ... existing ... */>
           <Plus className="w-4 h-4 mr-2" />
           Vincular Procedimento
         </Button>
       </div>

       {/* ... existing table ... */}

+      {isSelfView && (
+        <CreateProcedureDialog
+          clinicId={clinicId}
+          doctorId={doctorId}
+          open={showCreate}
+          onClose={() => setShowCreate(false)}
+        />
+      )}
       {/* ... existing dialogs ... */}
     </div>
   )
 }
```

### Import necessario

Adicionar import do `useCreateAndLinkProcedure` e `Textarea`:

```typescript
import { useCreateAndLinkProcedure } from '@/features/clinic/api/doctor-procedures.api'
import { Textarea } from '@/components/ui/textarea'
```

## Feito quando

- [ ] Doctor ve botao "Criar Procedimento" na tab Procedimentos (self-view)
- [ ] Manager NAO ve o botao (isSelfView=false)
- [ ] Dialog permite preencher: nome, descricao, categoria, duracao, preco
- [ ] Ao criar, procedimento aparece na tabela de procedimentos vinculados
- [ ] Procedimento tambem aparece no catalogo da clinica (acessivel pelo manager)
- [ ] Validacao: nome obrigatorio, duracao obrigatoria
- [ ] Toast de sucesso/erro
