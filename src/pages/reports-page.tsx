import { useEffect, useState } from "react";
import { fetchUsers, fetchWallet, fetchMapSnapshot } from "@/lib/admin-api";
import { toast } from "sonner";
import { DollarSign, Users, CheckCircle, Ban, TrendingUp, Clock } from "lucide-react";

export default function ReportsPage() {
  const [metrics, setMetrics] = useState({
    totalRevenue: "Bs 0.00",
    totalClients: "0",
    totalWorkers: "0",
    completionRate: "0%",
    completedJobs: "0",
    cancelledJobs: "0",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [users, wallet, snapshot] = await Promise.all([
          fetchUsers().catch(() => []),
          fetchWallet("month").catch(() => ({ totals: { totalEarnings: 0, totalJobs: 0 } })),
          fetchMapSnapshot().catch(() => ({ requests: [], workers: [], clients: [] })),
        ]);

        if (!mounted) return;

        const clientsCount = users.filter((u) => u.type === "client").length;
        const workersCount = users.filter((u) => u.type === "worker").length;
        const totalEarnings = wallet.totals?.totalEarnings || 0;
        const totalJobs = wallet.totals?.totalJobs || 0;

        // Calcular métricas reales a partir de las solicitudes del snapshot
        const reqs = snapshot.requests || [];
        const completedCount = reqs.filter((r) => r.status === "completed").length;
        const cancelledCount = reqs.filter((r) => r.status === "cancelled").length;
        const resolvedTotal = completedCount + cancelledCount;
        
        let calculatedRate = "0%";
        if (resolvedTotal > 0) {
          calculatedRate = `${Math.round((completedCount / resolvedTotal) * 100)}%`;
        } else if (totalJobs > 0) {
          calculatedRate = "100%";
        }

        setMetrics({
          totalRevenue: `Bs ${totalEarnings.toFixed(2)}`,
          totalClients: clientsCount.toString(),
          totalWorkers: workersCount.toString(),
          completionRate: calculatedRate,
          completedJobs: (completedCount || totalJobs).toString(),
          cancelledJobs: cancelledCount.toString(),
        });
      } catch {
        toast.error("Error al cargar analíticas");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Resumen de Analíticas</h2>
          <p className="mt-2 text-on-surface-variant">Monitorea el rendimiento del servicio y las métricas reales del negocio.</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Ganancias Totales (Mes)</p>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.totalRevenue}
          </h3>
          <p className="mt-1 text-xs text-emerald-400/80">Generado por trabajos completados</p>
        </div>

        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Clientes Registrados</p>
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.totalClients}
          </h3>
          <p className="mt-1 text-xs text-sky-400/80">Cuentas activas de clientes</p>
        </div>

        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Trabajadores en App</p>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.totalWorkers}
          </h3>
          <p className="mt-1 text-xs text-purple-400/80">Especialistas registrados</p>
        </div>

        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Tasa de Finalización</p>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.completionRate}
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">Ratio de trabajos culminados con éxito</p>
        </div>

        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Trabajos Completados</p>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.completedJobs}
          </h3>
          <p className="mt-1 text-xs text-emerald-400/80">Servicios finalizados</p>
        </div>

        <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Trabajos Cancelados</p>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <Ban className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {loading ? "..." : metrics.cancelledJobs}
          </h3>
          <p className="mt-1 text-xs text-rose-400/80">Cancelados por cliente o admin</p>
        </div>
      </div>
    </section>
  );
}
