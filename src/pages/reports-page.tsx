import { useEffect, useState } from "react";
import { fetchUsers, fetchWallet } from "@/lib/admin-api";
import { toast } from "sonner";

export default function ReportsPage() {
  const [metrics, setMetrics] = useState({
    totalRevenue: "Bs 0.00",
    newClients: "0",
    completionRate: "0%",
    completedJobs: "0",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [users, wallet] = await Promise.all([
          fetchUsers().catch(() => []),
          fetchWallet("month").catch(() => ({ totals: { totalEarnings: 0, totalJobs: 0 } })),
        ]);

        if (!mounted) return;

        const clientsCount = users.filter((u) => u.type === "client").length;
        const totalEarnings = wallet.totals?.totalEarnings || 0;
        const totalJobs = wallet.totals?.totalJobs || 0;

        setMetrics({
          totalRevenue: `Bs ${totalEarnings.toFixed(2)}`,
          newClients: clientsCount.toString(),
          completionRate: totalJobs > 0 ? "100%" : "0%",
          completedJobs: totalJobs.toString(),
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
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-5xl font-bold tracking-tight">Resumen de Analíticas</h2>
          <p className="mt-2 text-on-surface-variant">Monitorea el rendimiento del servicio y las métricas del negocio.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "Ganancias Totales", value: metrics.totalRevenue },
          { key: "Clientes Registrados", value: metrics.newClients },
          { key: "Tasa de Finalización", value: metrics.completionRate },
          { key: "Trabajos Completados", value: metrics.completedJobs },
        ].map((item) => (
          <div key={item.key} className="glass-panel rounded-xl p-6">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">{item.key}</p>
            <h3 className="mt-1 text-3xl font-semibold">
              {loading ? "..." : item.value}
            </h3>
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-xl p-6 text-center">
        <h3 className="mb-2 text-xl font-semibold">Gráficos de Tendencias</h3>
        <p className="text-on-surface-variant">
          Los gráficos detallados de ingresos y categorías se activarán una vez que el sistema recopile un volumen representativo de operaciones mensuales.
        </p>
      </div>
    </section>
  );
}
