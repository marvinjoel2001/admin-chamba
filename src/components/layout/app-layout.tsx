import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";

const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/map", "Real-time Map", Map],
  ["/workers", "Workers", Users],
  ["/clients", "Clients", UserSquare2],
  ["/requests", "Requests", ClipboardList],
  ["/reports", "Reports", BarChart3],
  ["/wallet", "Wallet", WalletCards],
  ["/worker-settings", "Worker Config", RadioTower],
  ["/disputes", "Disputas", ShieldAlert],
  ["/categories", "Categorías", FolderOpen],
  ["/logs", "API Logs", Activity],
  ["/settings", "Settings", Settings],
] as const;

export function AppLayout() {
  const { search, setSearch } = useAdminStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          {nav.map(([to, label, Icon]) => (
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
              <span>{label}</span>
            </NavLink>
          ))}
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
              {nav.map(([to, label, Icon]) => (
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
                  <span>{label}</span>
                </NavLink>
              ))}
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
      <main className="w-full px-4 pb-12 pt-[calc(64px+24px)] sm:px-6 md:ml-[280px] md:px-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  );
}
