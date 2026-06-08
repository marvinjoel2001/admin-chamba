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

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
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
