import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateFaq, useDeleteFaq, useFaqs, useUpdateFaq } from '../../api/faq.api'
import type { FaqItem } from '../../types/faq.types'

const schema = z.object({
  question: z.string().min(1, 'Obrigatório').max(500),
  answer: z.string().min(1, 'Obrigatório').max(2000),
})

type FormValues = z.infer<typeof schema>

interface FaqFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  faq?: FaqItem
}

function FaqFormDialog({ open, onOpenChange, faq }: FaqFormDialogProps) {
  const { mutate: create, isPending: isCreating } = useCreateFaq()
  const { mutate: update, isPending: isUpdating } = useUpdateFaq()
  const isPending = isCreating || isUpdating

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: faq
      ? { question: faq.question, answer: faq.answer }
      : { question: '', answer: '' },
  })

  function onSubmit(values: FormValues) {
    if (faq) {
      update({ faqId: faq.id, data: values }, { onSuccess: () => onOpenChange(false) })
    } else {
      create(values, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? 'Editar FAQ' : 'Adicionar FAQ'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="question">Pergunta *</Label>
            <Textarea id="question" rows={2} {...form.register('question')} />
            {form.formState.errors.question && (
              <p className="text-sm text-destructive">{form.formState.errors.question.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="answer">Resposta *</Label>
            <Textarea id="answer" rows={4} {...form.register('answer')} />
            {form.formState.errors.answer && (
              <p className="text-sm text-destructive">{form.formState.errors.answer.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface FaqCardProps {
  faq: FaqItem
}

function FaqCard({ faq }: FaqCardProps) {
  const { mutate: remove, isPending: isDeleting } = useDeleteFaq()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium text-sm">{faq.question}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FaqFormDialog open={editOpen} onOpenChange={setEditOpen} faq={faq} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(faq.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function FaqSubtab() {
  const { data: faqs = [], isLoading } = useFaqs()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">FAQ</h3>
          <p className="text-sm text-muted-foreground">
            Perguntas e respostas que a Carol usará para responder os pacientes.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar FAQ
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">Nenhum FAQ cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione perguntas frequentes para a Carol responder com mais precisão.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FaqCard key={faq.id} faq={faq} />
          ))}
        </div>
      )}

      <FaqFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
