import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen"; // Auto-gerado pelo plugin
import { queryClient } from "./queryClient";

export const router = createRouter({
  routeTree,
  context: {
    queryClient, // Disponível em todos os loaders
  },
  defaultPreload: "intent", // Preload ao hover
  defaultPreloadStaleTime: 0,
});

// Type-safety para router context
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
