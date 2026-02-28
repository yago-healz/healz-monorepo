import api from "@/lib/api/axios";
import { CLINIC_MEMBERS_ENDPOINTS } from "@/lib/api/clinic-members-endpoints";
import { tokenService } from "@/services/token.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type ClinicMemberRole =
  | "admin"
  | "manager"
  | "doctor"
  | "receptionist"
  | "viewer";

export type ClinicMemberStatus = "active" | "inactive" | "pending";

export interface ClinicMember {
  userId: string;
  name: string;
  email: string;
  role: ClinicMemberRole;
  status: ClinicMemberStatus;
  emailVerified: boolean;
  joinedAt: string;
}

export interface ClinicMembersResponse {
  data: ClinicMember[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InviteNewMemberRequest {
  name: string;
  email: string;
  role: ClinicMemberRole;
}

// ============================================
// QUERIES
// ============================================

export function useClinicMembers(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const clinicId = tokenService.getActiveClinicId();
  return useQuery<ClinicMembersResponse>({
    queryKey: ["clinic-members", clinicId, params],
    queryFn: () =>
      api
        .get(CLINIC_MEMBERS_ENDPOINTS.LIST(clinicId!), { params })
        .then((r) => r.data),
    enabled: !!clinicId,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useRemoveMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(CLINIC_MEMBERS_ENDPOINTS.REMOVE(clinicId!, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Membro removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover membro"),
  });
}

export function useUpdateMemberRole() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ClinicMemberRole }) =>
      api.patch(CLINIC_MEMBERS_ENDPOINTS.UPDATE_ROLE(clinicId!, userId), {
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Cargo atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar cargo"),
  });
}

export function useResendInvite() {
  const clinicId = tokenService.getActiveClinicId();
  return useMutation({
    mutationFn: (email: string) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.RESEND_INVITE(clinicId!), { email }),
    onSuccess: () => toast.success("Convite reenviado com sucesso!"),
    onError: () => toast.error("Erro ao reenviar convite"),
  });
}

export function useInviteNewMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: InviteNewMemberRequest) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.INVITE_NEW(), { ...dto, clinicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Convite enviado com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar convite"),
  });
}

export function useAddExistingMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { userId: string; role: ClinicMemberRole }) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.ADD_EXISTING(clinicId!), dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Membro adicionado com sucesso!");
    },
    onError: () => toast.error("Erro ao adicionar membro"),
  });
}
