import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ShieldOff } from 'lucide-react'
import { usePlatformAdmins, useRevokePlatformAdmin } from '../../api/platform-admins-api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function PlatformAdminsTable() {
  const { data: admins, isLoading } = usePlatformAdmins()
  const revoke = useRevokePlatformAdmin()

  if (isLoading) return <Skeleton className="h-32 w-full" />

  if (!admins?.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum platform admin cadastrado
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Desde</TableHead>
          <TableHead className="w-[80px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.id}>
            <TableCell className="font-medium">{admin.userName}</TableCell>
            <TableCell className="text-muted-foreground">{admin.userEmail}</TableCell>
            <TableCell>
              {format(new Date(admin.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            </TableCell>
            <TableCell>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Revogar permissões de {admin.userName}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {admin.userName} perderá acesso ao painel de platform admin
                      imediatamente. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => revoke.mutate(admin.id)}
                    >
                      Revogar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
