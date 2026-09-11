import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import DashboardPage from "@/pages/dashboard-page";
import MapPage from "@/pages/map-page";
import WorkersPage from "@/pages/workers-page";
import ClientsPage from "@/pages/clients-page";
import RequestsPage from "@/pages/requests-page";
import ReportsPage from "@/pages/reports-page";
import WalletPage from "@/pages/wallet-page";
import SettingsPage from "@/pages/settings-page";
import WorkerSettingsPage from "@/pages/worker-settings-page";
import LogsPage from "@/pages/logs-page";
import DisputesPage from "@/pages/disputes-page";
import CategoriesPage from "@/pages/categories-page";
import PaymentMethodsPage from "@/pages/payment-methods-page";
import NotificationsPage from "@/pages/notifications-page";
import LoginPage from "@/pages/login-page";
import LeadsPage from "@/pages/leads-page";
import AgenciesPage from "@/pages/agencies-page";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { api } from "@/lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [checking, setChecking] = useState(true);
  const [isValid, setIsValid] = useState<boolean>(() => isAuthenticated());

  useEffect(() => {
    let active = true;

    if (!token || !isAuthenticated()) {
      logout();
      setIsValid(false);
      setChecking(false);
      return;
    }

    // Verificación de sesión contra el servidor /auth/admin/me
    api.get("/auth/admin/me")
      .then(() => {
        if (active) {
          setIsValid(true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          logout();
          setIsValid(false);
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#13101d] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-xs text-white/50">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isValid) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (token && isAuthenticated()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "map", element: <MapPage /> },
      { path: "workers", element: <WorkersPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "requests", element: <RequestsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "worker-settings", element: <WorkerSettingsPage /> },
      { path: "logs", element: <LogsPage /> },
      { path: "disputes", element: <DisputesPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "payment-methods", element: <PaymentMethodsPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "leads", element: <LeadsPage /> },
      { path: "agencies", element: <AgenciesPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  const { theme } = useThemeStore();
  const touchActivity = useAuthStore((s) => s.touchActivity);

  useEffect(() => {
    let lastThrottled = 0;
    const onUserActivity = () => {
      const now = Date.now();
      // Throttling: registrar actividad a lo sumo cada 30 segundos
      if (now - lastThrottled > 30000) {
        lastThrottled = now;
        touchActivity();
      }
    };

    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });
    window.addEventListener("touchstart", onUserActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
    };
  }, [touchActivity]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme={theme} />
    </>
  );
}
