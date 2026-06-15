import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/admin-api";
import { Users, CheckCircle2, Radio, XCircle, Search, SlidersHorizontal } from "lucide-react";

export default function DashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      try {
        const users = await fetchUsers().catch(() => []);
        if (!mounted) return;
        setTotalUsers(users.length);
      } catch {
        // Silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex w-full gap-6 h-[calc(100vh-8rem)]">
      {/* Left Area (Map / Main Content) */}
      <div className="flex-1 flex flex-col gap-6 relative rounded-[24px] overflow-hidden">
        {/* Abstract Map Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 100 Q 25 50 50 100 T 100 100 M 50 0 Q 75 50 100 0' fill='none' stroke='%237c3aed' stroke-width='0.5' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23p)'/%3E%3C/svg%3E")`,
          backgroundSize: 'cover'
        }} />
        
        {/* Top Widgets Row */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Activos */}
          <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-[#120f1a]/60 p-5 backdrop-blur-xl hover:bg-[#120f1a]/80 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative">
              <div className="absolute inset-0 rounded-full border border-purple-500/30"></div>
              <Users className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight">{loading ? "-" : totalUsers}</span>
              <span className="text-[13px] text-white/50 leading-tight">Activos</span>
            </div>
          </div>

          {/* Completados */}
          <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-[#120f1a]/60 p-5 backdrop-blur-xl hover:bg-[#120f1a]/80 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative">
              <div className="absolute inset-0 rounded-full border border-emerald-500/30"></div>
              <CheckCircle2 className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight">0</span>
              <span className="text-[13px] text-white/50 leading-tight">Completados</span>
            </div>
          </div>

          {/* En Proceso */}
          <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-[#120f1a]/60 p-5 backdrop-blur-xl hover:bg-[#120f1a]/80 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)] relative">
              <div className="absolute inset-0 rounded-full border border-orange-500/30"></div>
              <Radio className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight">0</span>
              <span className="text-[13px] text-white/50 leading-tight">En Proceso</span>
            </div>
          </div>

          {/* Cancelados */}
          <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-[#120f1a]/60 p-5 backdrop-blur-xl hover:bg-[#120f1a]/80 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.15)] relative">
              <div className="absolute inset-0 rounded-full border border-rose-500/30"></div>
              <XCircle className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight">0</span>
              <span className="text-[13px] text-white/50 leading-tight">Cancelados</span>
            </div>
          </div>
        </div>

      </div>

      {/* Right Side Panel */}
      <div className="w-[350px] flex-shrink-0 flex flex-col rounded-[24px] border border-white/5 bg-[#120f1a]/80 backdrop-blur-2xl overflow-hidden shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
        {/* Tabs */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-1 w-full max-w-[240px]">
            <button className="flex-1 rounded-xl bg-purple-500/10 text-purple-300 py-2.5 text-[13px] font-medium border border-purple-500/20 shadow-[inset_0_0_12px_rgba(168,85,247,0.15)]">
              Solicitudes
            </button>
            <button className="flex-1 rounded-xl text-white/50 py-2.5 text-[13px] font-medium hover:text-white transition-colors">
              Workers
            </button>
          </div>
          <button className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 px-3 py-2.5 shadow-inner">
            <Search size={16} className="text-white/40" />
            <input
              type="text"
              placeholder="Buscar por título, cliente, dirección..."
              className="w-full border-none bg-transparent p-0 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 p-4 pt-0">
          <div className="text-[13px] text-white/40 mb-4">
            0 solicitudes encontradas
          </div>
          {/* Empty state or list goes here */}
        </div>
      </div>
    </div>
  );
}
