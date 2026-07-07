import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
import { useAuthStore } from "@/store/auth-store";
import { Navigate } from "react-router-dom";
import LeadsPage from "@/pages/leads-page";
import AgenciesPage from "@/pages/agencies-page";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (isAuthenticated) return <Navigate to="/" replace />;
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
  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme="dark" />
    </>
  );
}
