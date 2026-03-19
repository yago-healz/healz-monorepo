import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateAndLinkProcedure,
  useDoctorProcedures,
  useLinkDoctorProcedure,
  useUnlinkDoctorProcedure,
  useUpdateDoctorProcedure,
} from '@/features/clinic/api/doctor-procedures.api'
import { Textarea } from '@/components/ui/textarea'
import { useProcedures } from '@/features/clinic/api/procedures.api'
import { tokenService } from '@/services/token.service'
import type { DoctorProcedure } from '@/types/doctor.types'
import { Edit2, Link2Off, Loader2, Plus, Stethoscope } from 'lucide-react'
import { useState } from 'react'

interface DoctorProceduresTabProps {
  doctorId: string
  isSelfView?: boolean
}

function formatPrice(price: number | null): string {
  if (price === null) return 'A definir'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price / 100)
}

// ============ Link Dialog ============
interface LinkDialogProps {
  clinicId: string
  doctorId: string
  linkedProcedureIds: Set<string>
  open: boolean
  onClose: () => void
}

function LinkProcedureDialog({ clinicId, doctorId, linkedProcedureIds, open, onClose }: LinkDialogProps) {
  const [selectedProcedureId, setSelectedProcedureId] = useState('')
  const [price, setPrice] = useState('')
  const [durationOverride, setDurationOverride] = useState('')

  const { data: proceduresData } = useProcedures(clinicId, { status: 'active', limit: 50 })
  const { mutate: link, isPending } = useLinkDoctorProcedure(clinicId, doctorId)

  const available = (proceduresData?.data ?? []).filter((p) => !linkedProcedureIds.has(p.id))

  function handleSubmit() {
    if (!selectedProcedureId) return
    link(
      {
        procedureId: selectedProcedureId,
        price: price ? Math.round(parseFloat(price) * 100) : undefined,
        durationOverride: durationOverride ? parseInt(durationOverride) : undefined,
      },
      {
        onSuccess: () => {
          setSelectedProcedureId('')
          setPrice('')
          setDurationOverride('')
          onClose()
        },
      },
    )
  }

  function handleClose() {
    setSelectedProcedureId('')
    setPrice('')
    setDurationOverride('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Procedimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Procedimento *</Label>
            <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um procedimento" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Nenhum procedimento disponível
                  </SelectItem>
                ) : (
                  available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.category ? ` — ${p.category}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 150,00 — deixe em branco para definir depois"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Duração customizada (min)</Label>
            <Input
              type="number"
              min="5"
              max="480"
              step="5"
              placeholder="Usar duração padrão do procedimento"
              value={durationOverride}
              onChange={(e) => setDurationOverride(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProcedureId || isPending}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Edit Dialog ============
interface EditDialogProps {
  clinicId: string
  doctorId: string
  procedure: DoctorProcedure
  open: boolean
  onClose: () => void
}

function EditProcedureLinkDialog({ clinicId, doctorId, procedure, open, onClose }: EditDialogProps) {
  const [price, setPrice] = useState(
    procedure.price !== null ? String(procedure.price / 100) : '',
  )
  const [durationOverride, setDurationOverride] = useState(
    procedure.durationOverride !== null ? String(procedure.durationOverride) : '',
  )

  const { mutate: update, isPending } = useUpdateDoctorProcedure(clinicId, doctorId)

  function handleSubmit() {
    update(
      {
        procedureId: procedure.procedureId,
        data: {
          price: price ? Math.round(parseFloat(price) * 100) : undefined,
          durationOverride: durationOverride ? parseInt(durationOverride) : undefined,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Vínculo — {procedure.procedureName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="A definir"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Duração customizada (min)</Label>
            <Input
              type="number"
              min="5"
              max="480"
              step="5"
              placeholder={`Usar padrão: ${procedure.procedureDefaultDuration} min`}
              value={durationOverride}
              onChange={(e) => setDurationOverride(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Unlink Confirmation ============
interface UnlinkDialogProps {
  clinicId: string
  doctorId: string
  procedure: DoctorProcedure
  open: boolean
  onClose: () => void
}

function UnlinkConfirmDialog({ clinicId, doctorId, procedure, open, onClose }: UnlinkDialogProps) {
  const { mutate: unlink, isPending } = useUnlinkDoctorProcedure(clinicId, doctorId)

  function handleConfirm() {
    unlink(procedure.procedureId, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Desvincular Procedimento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Deseja desvincular <strong>{procedure.procedureName}</strong> deste médico? Esta ação pode
          ser revertida vinculando novamente.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desvincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Create Dialog ============
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
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do procedimento..."
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
              <Label>Duração padrão (min) *</Label>
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
            <Label>Preço (R$)</Label>
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

// ============ Main Component ============
export function DoctorProceduresTab({ doctorId, isSelfView = false }: DoctorProceduresTabProps) {
  const clinicId = tokenService.getActiveClinicId() ?? ''
  const { data: procedures, isLoading } = useDoctorProcedures(clinicId, doctorId)

  const [showLink, setShowLink] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<DoctorProcedure | null>(null)
  const [unlinkTarget, setUnlinkTarget] = useState<DoctorProcedure | null>(null)

  const linkedIds = new Set((procedures ?? []).map((p) => p.procedureId))

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {isSelfView && (
          <Button onClick={() => setShowCreate(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Criar Procedimento
          </Button>
        )}
        <Button
          onClick={() => setShowLink(true)}
          className="bg-pink-500 hover:bg-pink-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Vincular Procedimento
        </Button>
      </div>

      {!procedures || procedures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Stethoscope className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum procedimento vinculado.</p>
          <p className="text-xs mt-1">
            Vincule procedimentos para definir o que este médico realiza.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Procedimento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Duração base</TableHead>
              <TableHead>Duração custom.</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {procedures.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.procedureName}</TableCell>
                <TableCell>
                  {p.procedureCategory ? (
                    <Badge variant="secondary">{p.procedureCategory}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{p.procedureDefaultDuration} min</TableCell>
                <TableCell>
                  {p.durationOverride !== null ? (
                    `${p.durationOverride} min`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{formatPrice(p.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditTarget(p)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setUnlinkTarget(p)}
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isSelfView && (
        <CreateProcedureDialog
          clinicId={clinicId}
          doctorId={doctorId}
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      <LinkProcedureDialog
        clinicId={clinicId}
        doctorId={doctorId}
        linkedProcedureIds={linkedIds}
        open={showLink}
        onClose={() => setShowLink(false)}
      />

      {editTarget && (
        <EditProcedureLinkDialog
          clinicId={clinicId}
          doctorId={doctorId}
          procedure={editTarget}
          open={true}
          onClose={() => setEditTarget(null)}
        />
      )}

      {unlinkTarget && (
        <UnlinkConfirmDialog
          clinicId={clinicId}
          doctorId={doctorId}
          procedure={unlinkTarget}
          open={true}
          onClose={() => setUnlinkTarget(null)}
        />
      )}
    </div>
  )
}
