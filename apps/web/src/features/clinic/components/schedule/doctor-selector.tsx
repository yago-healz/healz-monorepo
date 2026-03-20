import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DoctorProfile } from '@/types/doctor.types'

interface DoctorSelectorProps {
  doctors: DoctorProfile[]
  selectedDoctorId: string | null
  onSelect: (doctorId: string) => void
  isLoading: boolean
}

export function DoctorSelector({ doctors, selectedDoctorId, onSelect, isLoading }: DoctorSelectorProps) {
  return (
    <Select value={selectedDoctorId ?? ''} onValueChange={onSelect} disabled={isLoading}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Selecionar médico..." />
      </SelectTrigger>
      <SelectContent>
        {doctors.map((doctor) => (
          <SelectItem key={doctor.id} value={doctor.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={doctor.photoUrl ?? undefined} alt={doctor.name} />
                <AvatarFallback className="text-xs">
                  {doctor.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{doctor.name}</span>
              {doctor.specialty && (
                <span className="text-muted-foreground text-xs">— {doctor.specialty}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
