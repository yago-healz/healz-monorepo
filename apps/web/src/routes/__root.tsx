import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Outlet />
      </div>

      {/* Toast notifications */}
      <Toaster />

      {/* DevTools - apenas em desenvolvimento */}
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools initialIsOpen={false} position="bottom" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </ErrorBoundary>
  );
}
