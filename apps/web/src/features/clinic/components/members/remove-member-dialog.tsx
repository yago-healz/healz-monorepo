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
import {
  useRemoveMember,
  type ClinicMember,
} from '@/features/clinic/api/clinic-members.api'

interface RemoveMemberDialogProps {
  member: ClinicMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RemoveMemberDialog({ member, open, onOpenChange }: RemoveMemberDialogProps) {
  const removeMember = useRemoveMember()

  function handleConfirm() {
    if (!member) return
    removeMember.mutate(member.userId, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{member?.name}</strong> da clínica?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={removeMember.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
