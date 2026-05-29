import { useEffect, useState } from "react";
import { fetchUsers, fetchMapSnapshot, fetchWallet } from "@/lib/admin-api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    revenue: "Bs 0.00",
    workers: "0",
    requests: "0",
    clients: "0",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [users, snapshot, wallet] = await Promise.all([
          fetchUsers().catch(() => []),
          fetchMapSnapshot().catch(() => ({ workers: [], clients: [], requests: [] })),
          fetchWallet("month").catch(() => ({ totals: { totalEarnings: 0 } })),
        ]);

        if (!mounted) return;

        const workersCount = users.filter((u) => u.type === "worker").length;
        const clientsCount = users.filter((u) => u.type === "client").length;
        const requestsCount = snapshot.requests?.length || 0;
        const totalEarnings = wallet.totals?.totalEarnings || 0;

        setMetrics({
          revenue: `Bs ${totalEarnings.toFixed(2)}`,
          workers: workersCount.toString(),
          requests: requestsCount.toString(),
          clients: clientsCount.toString(),
        });
      } catch {
        // En caso de fallo total, mantiene los valores en 0
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Dashboard Principal</h2>
        <p className="mt-2 text-on-surface-variant">Panel operativo con métricas, actividad y estado del sistema.</p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "Revenue", value: metrics.revenue },
          { key: "Workers", value: metrics.workers },
          { key: "Requests", value: metrics.requests },
          { key: "Clients", value: metrics.clients },
        ].map((item) => (
          <div key={item.key} className="glass-panel rounded-xl p-4 sm:p-6">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">{item.key}</p>
            <p className="mt-1 text-2xl font-semibold sm:text-3xl">
              {loading ? "Cargando..." : item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold sm:text-xl">Live Activity</h3>
        <p className="mt-2 text-sm text-on-surface-variant sm:text-base">Actividad en tiempo real integrada con los módulos.</p>
      </div>
    </section>
  );
}
