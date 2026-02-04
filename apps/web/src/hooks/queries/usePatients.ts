import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface CreatePatientData {
  name: string;
  email: string;
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => apiClient<Patient[]>("/api/patients"),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientData) =>
      apiClient<Patient>("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalida cache para refetch
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
