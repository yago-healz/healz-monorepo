import { createFileRoute } from "@tanstack/react-router";
import { apiClient } from "@/lib/api/client";

interface Patient {
  id: string;
  name: string;
  email: string;
}

// Loader function - executa antes do componente renderizar
async function fetchPatients(): Promise<Patient[]> {
  return apiClient<Patient[]>("/api/patients");
}

// @ts-expect-error - Route será registrada automaticamente pelo TanStack Router plugin
export const Route = createFileRoute("/patients/")({
  loader: async ({ context }) => {
    // Usa o QueryClient do contexto para cache
    return await context.queryClient.ensureQueryData({
      queryKey: ["patients"],
      queryFn: fetchPatients,
    });
  },
  component: PatientsPage,
});

function PatientsPage() {
  const patients = Route.useLoaderData();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Pacientes</h1>
      <div className="grid gap-4">
        {patients?.map((patient: Patient) => (
          <div key={patient.id} className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold">{patient.name}</h3>
            <p className="text-gray-600">{patient.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
