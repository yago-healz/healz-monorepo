import api from "@/lib/api/axios";
import { CLINIC_SETTINGS_ENDPOINTS } from "@/lib/api/clinic-settings-endpoints";
import { tokenService } from "@/services/token.service";
import type {
  NotificationSettings,
  PainPoint,
  Priority,
  SchedulingRules,
  Service,
  TimeBlock,
} from "@/types/onboarding";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============================================
// GENERAL
// ============================================

export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ClinicGeneralResponse {
  id: string;
  name: string;
  description?: string | null;
  address?: Address | null;
}

export interface SaveClinicGeneralRequest {
  name?: string;
  description?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
}

// ============================================
// OBJECTIVES
// ============================================

export interface ClinicObjectivesResponse {
  id: string;
  clinicId: string;
  priorities: Priority[];
  painPoints: PainPoint[];
  additionalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const useClinicObjectives = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "objectives"],
    queryFn: async (): Promise<ClinicObjectivesResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId),
      );
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicObjectives = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      priorities: Omit<Priority, "icon">[];
      painPoints: Omit<PainPoint, "icon">[];
      additionalNotes?: string;
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId),
        data,
      );
      return response.data as ClinicObjectivesResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "objectives"],
      });
      toast.success("Objetivos salvos com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar objetivos");
    },
  });
};

// ============================================
// SERVICES
// ============================================

export interface ClinicServicesResponse {
  id: string;
  clinicId: string;
  services: Service[];
  createdAt: string;
  updatedAt?: string;
}

export const useClinicServices = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "services"],
    queryFn: async (): Promise<ClinicServicesResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId),
      );
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicServices = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { services: Service[] }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId),
        data,
      );
      return response.data as ClinicServicesResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "services"],
      });
      toast.success("Serviços salvos com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar serviços");
    },
  });
};

// ============================================
// SCHEDULING
// ============================================

export interface ClinicSchedulingResponse extends SchedulingRules {
  id: string;
  clinicId: string;
  // Legacy fields (for backward compatibility)
  timeBlocks?: TimeBlock[];
  minimumInterval?: number;
  createdAt: string;
  updatedAt?: string;
}

export const useClinicScheduling = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "scheduling"],
    queryFn: async (): Promise<ClinicSchedulingResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId),
      );
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicScheduling = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SchedulingRules) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId),
        data,
      );
      return response.data as ClinicSchedulingResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "scheduling"],
      });
      toast.success("Configurações de agendamento salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações de agendamento");
    },
  });
};

// ============================================
// CAROL SETTINGS
// ============================================

export interface ClinicCarolSettingsResponse {
  id: string;
  clinicId: string;
  selectedTraits: string[];
  greeting: string;
  restrictSensitiveTopics: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const useClinicCarolSettings = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "carol"],
    queryFn: async (): Promise<ClinicCarolSettingsResponse | null> => {
      const response = await api.get(CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId));
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicCarolSettings = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      selectedTraits: string[];
      greeting: string;
      restrictSensitiveTopics: boolean;
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId),
        data,
      );
      return response.data as ClinicCarolSettingsResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "carol"],
      });
      toast.success("Configurações do Carol salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações do Carol");
    },
  });
};

// ============================================
// NOTIFICATIONS
// ============================================

export interface ClinicNotificationsResponse {
  id: string;
  clinicId: string;
  notificationSettings: NotificationSettings;
  alertChannels: ("whatsapp" | "email")[];
  phoneNumbers?: string[];
  createdAt: string;
  updatedAt?: string;
}

export const useClinicNotifications = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "notifications"],
    queryFn: async (): Promise<ClinicNotificationsResponse | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId),
      );
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicNotifications = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      notificationSettings: NotificationSettings;
      alertChannels: ("whatsapp" | "email")[];
      phoneNumbers?: string[];
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId),
        data,
      );
      return response.data as ClinicNotificationsResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "notifications"],
      });
      toast.success("Configurações de notificações salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações de notificações");
    },
  });
};

// ============================================
// CONNECTORS
// ============================================

export interface ConnectorStatus {
  googleCalendar: boolean;
  whatsapp: boolean;
}

export const useClinicConnectors = (clinicId: string) => {
  return useQuery({
    queryKey: ["clinic", clinicId, "settings", "connectors"],
    queryFn: async (): Promise<ConnectorStatus | null> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.CONNECTORS(clinicId),
      );
      return response.data;
    },
    enabled: !!clinicId,
  });
};

export const useSaveClinicConnectors = (clinicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConnectorStatus) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.CONNECTORS(clinicId),
        payload,
      );
      return response.data as ConnectorStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic", clinicId, "settings", "connectors"],
      });
      toast.success("Conectores atualizados com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar conectores. Tente novamente.");
    },
  });
};

// ============================================
// GENERAL ──────────────────────────────────────────
// ============================================

export function useClinicGeneral() {
  const clinicId = tokenService.getActiveClinicId();
  return useQuery<ClinicGeneralResponse>({
    queryKey: ["clinic-settings", clinicId, "general"],
    queryFn: () =>
      api.get(CLINIC_SETTINGS_ENDPOINTS.GENERAL(clinicId!)).then((r) => r.data),
    enabled: !!clinicId,
  });
}

export function useSaveClinicGeneral() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();

  return useMutation<ClinicGeneralResponse, Error, SaveClinicGeneralRequest>({
    mutationFn: (data) =>
      api
        .patch(CLINIC_SETTINGS_ENDPOINTS.GENERAL(clinicId!), data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic-settings", clinicId, "general"],
      });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações.");
    },
  });
}
