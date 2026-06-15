import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/admin-api";
import { Users, Clock, CalendarDays } from "lucide-react";

export default function DashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      try {
        const users = await fetchUsers().catch(() => []);
        if (!mounted) return;
        setTotalUsers(users.length);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newToday = users.filter((u) => u.createdAt && new Date(u.createdAt) >= today).length;
        setNewUsersToday(newToday);
      } catch {
        // En caso de error mantenemos en 0
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const dateString = now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const timeString = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative min-h-[calc(100vh-120px)] w-full overflow-hidden bg-[#0a0514] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center justify-center p-8">
      {/* Background Stars (Pure CSS) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[25%] w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] animate-pulse" />
        <div className="absolute top-[30%] right-[25%] w-1.5 h-1.5 bg-purple-300 rounded-full shadow-[0_0_15px_3px_rgba(168,85,247,0.8)] animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[30%] left-[30%] w-0.5 h-0.5 bg-white rounded-full shadow-[0_0_5px_1px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[50%] right-[35%] w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[20%] right-[20%] w-1.5 h-1.5 bg-purple-200 rounded-full shadow-[0_0_12px_2px_rgba(168,85,247,0.8)] animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-[10%] left-[50%] w-1 h-1 bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-[60%] left-[15%] w-1 h-1 bg-purple-100 rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Big star crosses */}
        <div className="absolute top-[25%] left-[15%] text-purple-300/60 opacity-60 animate-pulse" style={{ animationDelay: '0.4s' }}>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="currentColor"/>
           </svg>
        </div>
        <div className="absolute top-[40%] right-[15%] text-purple-400/80 opacity-80 animate-pulse" style={{ animationDelay: '0.7s' }}>
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="currentColor"/>
           </svg>
        </div>
        <div className="absolute bottom-[35%] right-[28%] text-purple-300/50 opacity-50 animate-pulse" style={{ animationDelay: '1.2s' }}>
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="currentColor"/>
           </svg>
        </div>
        <div className="absolute bottom-[45%] left-[20%] text-purple-400/40 opacity-40 animate-pulse" style={{ animationDelay: '2.5s' }}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="currentColor"/>
           </svg>
        </div>
      </div>

      {/* Curved Horizon at bottom */}
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[150%] h-[300px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-purple-900/10 to-transparent blur-3xl rounded-[100%]" />
      <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[120%] h-[202px] border-t border-purple-500/50 bg-transparent rounded-[100%] shadow-[0_-10px_60px_rgba(168,85,247,0.4)]" />

      {/* Top right widgets (Date & Time) */}
      <div className="absolute top-6 right-6 hidden sm:flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-purple-200/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{dateString}</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-white/20" />
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeString}</span>
        </div>
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <Users className="w-8 h-8 text-purple-300" />
        </div>

        <h2 className="text-purple-200/80 text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-center">
          Usuarios Registrados en la App
        </h2>

        <div className="relative my-2">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black text-white tracking-tighter drop-shadow-[0_0_40px_rgba(168,85,247,0.6)]">
            {loading ? "..." : totalUsers.toLocaleString("en-US")}
          </h1>
        </div>

        <p className="text-purple-200/50 text-sm mt-2">
          Total de usuarios registrados
        </p>

        <div className="mt-8 bg-purple-900/40 border border-purple-500/40 rounded-full px-6 py-2.5 flex items-center gap-3 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-purple-800/50 transition-colors cursor-default">
          <Users className="w-4 h-4 text-purple-300" />
          <span className="text-purple-100 font-medium">+{newUsersToday} hoy</span>
        </div>
      </div>
    </div>
  );
}
