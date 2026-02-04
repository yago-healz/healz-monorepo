import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Healz - Healthcare Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Sistema de gerenciamento de saúde com React, TanStack Query & Router
        </p>
        <div className="flex gap-4">
          <Button>Começar</Button>
          <Button variant="outline">Saiba Mais</Button>
        </div>
      </div>
    </div>
  );
}
