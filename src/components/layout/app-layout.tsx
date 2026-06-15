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
  Search,
  Command,
  Sun,
  ChevronDown,
  ChevronsLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";
import { fetchDisputes, fetchWorkerVerificationInbox } from "@/lib/admin-api";
import { websocketService } from "@/lib/websocket-service";

const nav = [
  ["/", "Dashboard", LayoutDashboard, null],
  ["/map", "Mapa en Tiempo Real", Map, null],
  ["/workers", "Trabajadores", Users, "pendingVerifications"],
  ["/clients", "Clientes", UserSquare2, null],
  ["/requests", "Trabajos", ClipboardList, null],
  ["/reports", "Reportes", BarChart3, null],
  ["/wallet", "Billetera", WalletCards, null],
  ["/worker-settings", "Config. Trabajador", RadioTower, null],
  ["/disputes", "Disputas", ShieldAlert, "pendingDisputes"],
  ["/categories", "Categorías", FolderOpen, null],
  ["/payment-methods", "Métodos de Pago", CreditCard, null],
  ["/notifications", "Notificaciones", Bell, null],
  ["/logs", "API Logs", Activity, null],
  ["/settings", "Configuración", Settings, null],
] as const;

export function AppLayout() {
  const { search, setSearch, pendingDisputes, pendingVerifications, setPendingDisputes, setPendingVerifications } = useAdminStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="min-h-screen text-on-surface bg-[#0a0812]">
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />
      
      {/* Sidebar - Floating */}
      <aside className={`fixed left-4 top-4 bottom-4 z-40 hidden flex-col rounded-[24px] border border-white/5 bg-[#130f1e]/80 py-6 backdrop-blur-[20px] md:flex shadow-[0_0_50px_-12px_rgba(124,58,237,0.15)] transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-[260px]'}`}>
        <div className={`mb-8 px-6 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white overflow-hidden whitespace-nowrap">
            <Droplets size={20} className="text-purple-400 flex-shrink-0" />
            {!isCollapsed && <span>Chamba Admin</span>}
          </Link>
        </div>
        {!isCollapsed && <p className="mb-4 px-6 text-xs text-white/40 -mt-6">Admin Console</p>}
        
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-4 custom-scrollbar">
          {nav.map(([to, label, Icon, badgeKey]) => {
            const badgeCount = badgeKey === "pendingDisputes" ? pendingDisputes : 
                              badgeKey === "pendingVerifications" ? pendingVerifications : 0;
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-purple-500/10 text-purple-300 shadow-[inset_0_0_12px_rgba(168,85,247,0.1)] border border-purple-500/20"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center justify-center">
                      <Icon size={18} className={isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/60 transition-colors"} />
                      {badgeCount > 0 && isCollapsed && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      )}
                    </div>
                    {!isCollapsed && <span className="flex-1">{label}</span>}
                    {badgeCount > 0 && !isCollapsed && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/80 px-1.5 text-[10px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 bottom-8 flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-[#1a1528] text-white/50 hover:text-white hover:bg-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all z-50 group"
        >
          <ChevronsLeft size={16} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-screen w-[280px] flex-col border-r border-white/10 bg-[#130f1e] py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 px-6">
              <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-white" onClick={() => setMobileMenuOpen(false)}>
                <Droplets size={22} className="text-purple-400" />Chamba Admin
              </Link>
              <p className="mt-1 text-sm text-white/40">Admin Console</p>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-4 pb-8 custom-scrollbar">
              {nav.map(([to, label, Icon, badgeKey]) => {
                const badgeCount = badgeKey === "pendingDisputes" ? pendingDisputes : 
                                  badgeKey === "pendingVerifications" ? pendingVerifications : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${
                        isActive
                          ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
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

      {/* Header - Floating Pill */}
      <header className={`fixed top-4 right-4 z-30 flex h-16 items-center justify-between rounded-[24px] border border-white/5 bg-[#130f1e]/80 px-6 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_40px_-10px_rgba(124,58,237,0.1)] ${isCollapsed ? 'md:left-[120px]' : 'md:left-[292px]'}`}>
        <button
          className="text-white/60 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        {/* Search */}
        <div className="hidden w-[400px] items-center gap-2 rounded-full px-4 py-2 md:flex bg-black/40 border border-white/5 shadow-inner">
          <Search size={16} className="text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en toda la plataforma..."
            className="w-full border-none bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:outline-none focus:ring-0"
          />
          <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
            <Command size={10} /> K
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-white/60 hover:text-white transition-colors">
            <Bell size={18} />
            <span className="absolute 1 top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </button>
          <button className="text-white/60 hover:text-white transition-colors">
            <Sun size={18} />
          </button>
          <div className="flex items-center gap-3 border-l border-white/10 pl-6 cursor-pointer hover:bg-white/5 rounded-full p-1 pr-3 -mr-3 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 font-medium text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] border border-purple-400/30">
              A
            </div>
            <div className="hidden flex-col md:flex">
              <span className="text-sm font-semibold text-white leading-tight">Admin</span>
              <span className="text-[10px] text-white/50 leading-tight">Super Admin</span>
            </div>
            <ChevronDown size={14} className="text-white/40" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`w-full px-4 pb-12 pt-28 md:pr-4 transition-all duration-300 ${isCollapsed ? 'md:pl-[120px]' : 'md:pl-[292px]'}`}>
        <Outlet />
      </main>
    </div>
  );
}
