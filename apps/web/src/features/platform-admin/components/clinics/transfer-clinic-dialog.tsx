import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTransferClinic } from '../../api/clinics-api'
import { useOrganizations } from '../../api/organizations-api'
import { Loader2, ArrowRightLeft } from 'lucide-react'

const transferSchema = z.object({
  targetOrganizationId: z.string().uuid('Selecione uma organização'),
  keepUsers: z.boolean(),
})

type TransferFormValues = z.infer<typeof transferSchema>

interface TransferClinicDialogProps {
  clinicId: string
  clinicName: string
  currentOrganizationId: string
  trigger?: React.ReactNode
}

export function TransferClinicDialog({
  clinicId,
  clinicName,
  currentOrganizationId,
  trigger,
}: TransferClinicDialogProps) {
  const [open, setOpen] = useState(false)
  const transferMutation = useTransferClinic()
  const { data: orgsData, isLoading: isLoadingOrgs } = useOrganizations({
    page: 1,
    limit: 100,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      targetOrganizationId: '',
      keepUsers: true,
    },
  })

  const handleSubmit = async (data: TransferFormValues) => {
    await transferMutation.mutateAsync({
      id: clinicId,
      data: {
        targetOrganizationId: data.targetOrganizationId,
        keepUsers: data.keepUsers,
      },
    })
    setOpen(false)
    form.reset()
  }

  const availableOrgs = orgsData?.data.filter((org) => org.id !== currentOrganizationId) || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transferir Clínica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Clínica</DialogTitle>
          <DialogDescription>
            Transferir "{clinicName}" para outra organização
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetOrganizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organização de Destino</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingOrgs}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a organização" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione a organização para onde a clínica será transferida
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keepUsers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Manter usuários vinculados
                    </FormLabel>
                    <FormDescription>
                      Se marcado, os usuários da clínica serão mantidos. Caso contrário, todos os vínculos serão removidos.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={transferMutation.isPending}>
                {transferMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Transferir
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
