import { createFileRoute, redirect } from "@tanstack/react-router";
import { tokenService } from "@/services/token.service";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!tokenService.hasValidToken()) {
      throw redirect({ to: '/login' })
    }
    const user = tokenService.getUser()
    if (!user?.activeClinic) {
      throw redirect({ to: '/admin' })
    }
    throw redirect({ to: '/clinic' })
  },
  component: () => null,
});
