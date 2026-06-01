import { Link, NavLink, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Bell,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  UserSquare2,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  Droplets,
  WalletCards,
  RadioTower,
  Activity,
  ShieldAlert,
  FolderOpen,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";
import { fetchDisputes, fetchWorkerVerificationInbox } from "@/lib/admin-api";
import { websocketService } from "@/lib/websocket-service";

const nav = [
  ["/", "Dashboard", LayoutDashboard, null],
  ["/map", "Real-time Map", Map, null],
  ["/workers", "Workers", Users, "pendingVerifications"],
  ["/clients", "Clients", UserSquare2, null],
  ["/requests", "Trabajos", ClipboardList, null],
  ["/reports", "Reports", BarChart3, null],
  ["/wallet", "Wallet", WalletCards, null],
  ["/worker-settings", "Worker Config", RadioTower, null],
  ["/disputes", "Disputas", ShieldAlert, "pendingDisputes"],
  ["/categories", "Categorías", FolderOpen, null],
  ["/payment-methods", "Métodos de Pago", CreditCard, null],
  ["/logs", "API Logs", Activity, null],
  ["/settings", "Settings", Settings, null],
] as const;

export function AppLayout() {
  const { search, setSearch, pendingDisputes, pendingVerifications, setPendingDisputes, setPendingVerifications } = useAdminStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load badge counts on mount and connect WebSocket
  useEffect(() => {
    const loadBadgeCounts = async () => {
      try {
        const [disputes, verifications] = await Promise.all([
          fetchDisputes("open"),
          fetchWorkerVerificationInbox(),
        ]);
        setPendingDisputes(disputes.length);
        setPendingVerifications(verifications.length);
      } catch {
        // Silently fail - badges will just show 0
      }
    };
    void loadBadgeCounts();

    // Connect WebSocket for real-time updates
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, [setPendingDisputes, setPendingVerifications]);

  return (
    <div className="min-h-screen text-on-surface">
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-sidebar-width flex-col border-r border-white/10 bg-surface/60 py-container-margin backdrop-blur-[20px] md:flex">
        <div className="mb-section-gap px-gutter">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Droplets size={22} />Chamba Admin
          </Link>
          <p className="mt-1 text-sm text-on-surface-variant">Admin Console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {nav.map(([to, label, Icon, badgeKey]) => {
            const badgeCount = badgeKey === "pendingDisputes" ? pendingDisputes : 
                              badgeKey === "pendingVerifications" ? pendingVerifications : 0;
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
                    isActive
                      ? "border-l-2 border-primary bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badgeCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-screen w-[280px] flex-col border-r border-white/10 bg-surface py-container-margin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-section-gap px-gutter">
              <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary" onClick={() => setMobileMenuOpen(false)}>
                <Droplets size={22} />Chamba Admin
              </Link>
              <p className="mt-1 text-sm text-on-surface-variant">Admin Console</p>
            </div>
            <nav className="flex flex-1 flex-col gap-2">
              {nav.map(([to, label, Icon, badgeKey]) => {
                const badgeCount = badgeKey === "pendingDisputes" ? pendingDisputes : 
                                  badgeKey === "pendingVerifications" ? pendingVerifications : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
                        isActive
                          ? "border-l-2 border-primary bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <header className="fixed top-0 right-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-surface/60 px-gutter backdrop-blur-[20px] md:w-[calc(100%-280px)]">
        <button
          className="text-on-surface-variant md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="hidden w-64 items-center gap-2 rounded-full px-3 py-1.5 md:flex glass-input">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Global search..."
            className="w-full border-none bg-transparent p-0 text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-on-surface-variant hover:text-primary">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-300" />
          </button>
          <button className="text-on-surface-variant hover:text-primary">
            <Settings size={18} />
          </button>
          <div className="h-8 w-8 rounded-full border border-white/10 bg-surface-variant" />
        </div>
      </header>
      <main className="w-full md:w-[calc(100%-280px)] px-4 pb-12 pt-[calc(64px+24px)] sm:px-6 md:ml-[280px] md:px-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  );
}
