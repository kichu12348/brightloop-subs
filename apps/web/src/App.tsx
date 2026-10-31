import { lazy, Suspense, type ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Role } from "@brightloop/shared";
import { useAuthStore } from "./lib/useAuthStore.ts";
import { AppShellLayout } from "./layouts/AppShellLayout.tsx";
import { RequireRole } from "./features/auth/RequireRole.tsx";
import { PageSkeleton } from "./components/index.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy-Loaded Routes
const LoginPage = lazy(() => import("./pages/auth/LoginPage.tsx"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage.tsx"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage.tsx"));

const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage.tsx"));
const SubscriptionsPage = lazy(
  () => import("./pages/subscriptions/SubscriptionsPage.tsx"),
);
const SubscriptionDetailPage = lazy(
  () => import("./pages/subscriptions/SubscriptionDetailPage.tsx"),
);
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage.tsx"));
const InvoiceDetailPage = lazy(() => import("./pages/invoices/InvoiceDetailPage.tsx"));
const CatalogPage = lazy(() => import("./pages/catalog/CatalogPage.tsx"));
const CustomerPortalPage = lazy(() => import("./pages/portal/CustomerPortalPage.tsx"));

function RootRedirect(): ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === Role.Customer) {
    return <Navigate to="/portal" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated Workspace Routes */}
            <Route element={<AppShellLayout />}>
              <Route
                path="/dashboard"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff]}>
                    <DashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff]}>
                    <SubscriptionsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/subscriptions/:id"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff]}>
                    <SubscriptionDetailPage />
                  </RequireRole>
                }
              />
              <Route
                path="/invoices"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff]}>
                    <InvoicesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/invoices/:id"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff, Role.Customer]}>
                    <InvoiceDetailPage />
                  </RequireRole>
                }
              />
              <Route
                path="/catalog"
                element={
                  <RequireRole allowedRoles={[Role.Admin, Role.Staff]}>
                    <CatalogPage />
                  </RequireRole>
                }
              />
              <Route
                path="/portal"
                element={
                  <RequireRole allowedRoles={[Role.Customer]}>
                    <CustomerPortalPage />
                  </RequireRole>
                }
              />
            </Route>

            {/* Default Index and Fallback */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
