import type { ReactElement, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Role } from "@brightloop/shared";
import { useAuthStore } from "../../lib/useAuthStore.ts";

export interface RequireRoleProps {
  allowedRoles?: Role[];
  children: ReactNode;
}

export function RequireRole({
  allowedRoles,
  children,
}: RequireRoleProps): ReactElement {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    // If Customer role, redirect to customer portal
    if (user.role === Role.Customer) {
      return <Navigate to="/portal" replace />;
    }
    // If Admin/Staff, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

