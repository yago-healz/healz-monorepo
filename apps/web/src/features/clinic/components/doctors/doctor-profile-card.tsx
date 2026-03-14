import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDoctor, useUpdateDoctor, useUpdateDoctorLink } from '@/features/clinic/api/doctors.api'

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface DoctorProfileCardProps {
  doctorId: string
}

export function DoctorProfileCard({ doctorId }: DoctorProfileCardProps) {
  const { data: doctor, isLoading } = useDoctor(doctorId)
  const updateDoctor = useUpdateDoctor(doctorId)
  const updateLink = useUpdateDoctorLink(doctorId)

  // Profile form state
  const [crm, setCrm] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')

  // Link form state
  const [defaultDuration, setDefaultDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (doctor) {
      setCrm(doctor.crm ?? '')
      setSpecialty(doctor.specialty ?? '')
      setBio(doctor.bio ?? '')
      setDefaultDuration(doctor.doctorClinic.defaultDuration)
      setNotes(doctor.doctorClinic.notes ?? '')
      setIsActive(doctor.doctorClinic.isActive)
    }
  }, [doctor])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!doctor) return null

  return (
    <div className="space-y-6">
      {/* Section 1: Profile data */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <CardTitle className="text-base">Dados do Perfil</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {doctor.photoUrl && <AvatarImage src={doctor.photoUrl} alt={doctor.name} />}
              <AvatarFallback className="text-lg">{getInitials(doctor.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>CRM</Label>
              <Input
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="Ex: 123456/SP"
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex: Cardiologia"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descrição breve do médico..."
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateDoctor.mutate({
                  crm: crm || undefined,
                  specialty: specialty || undefined,
                  bio: bio || undefined,
                })
              }
              disabled={updateDoctor.isPending}
              className="bg-linear-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white"
            >
              {updateDoctor.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Clinic link */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <CardTitle className="text-base">Vínculo com a Clínica</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Duração Padrão (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={defaultDuration}
                onChange={(e) =>
                  setDefaultDuration(Math.max(5, Math.min(480, parseInt(e.target.value) || 30)))
                }
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>{isActive ? 'Vínculo ativo' : 'Vínculo inativo'}</Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o vínculo..."
              rows={2}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateLink.mutate({
                  defaultDuration,
                  notes: notes || undefined,
                  isActive,
                })
              }
              disabled={updateLink.isPending}
              className="bg-linear-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white"
            >
              {updateLink.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Vínculo'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
