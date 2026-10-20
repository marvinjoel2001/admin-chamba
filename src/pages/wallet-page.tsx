import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { fetchWallet } from "@/lib/admin-api";
import type { WalletWorker } from "@/lib/types";
import { toast } from "sonner";

export default function WalletPage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [workers, setWorkers] = useState<WalletWorker[]>([]);
  const [totals, setTotals] = useState({ totalEarnings: 0, totalJobs: 0, totalCommission: 0 });
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchWallet(period);
        if (!mounted) return;
        setWorkers(data.workers);
        setTotals({ totalCommission: 0, ...data.totals });
        setCommissionPercent(data.commissionPercent ?? null);
      } catch {
        toast.error("No se pudo cargar billetera desde backend");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [period]);

  const columns = useMemo<ColumnDef<WalletWorker>[]>(
    () => [
      { accessorKey: "name", header: "Trabajador" },
      { accessorKey: "jobsCompleted", header: "Trabajos" },
      {
        accessorKey: "earnings",
        header: "Ganancias",
        cell: ({ row }) => `Bs ${Number(row.original.earnings).toFixed(2)}`,
      },
      {
        accessorKey: "platformFees",
        header: "Comisión Chamba",
        cell: ({ row }) => `Bs ${Number(row.original.platformFees ?? 0).toFixed(2)}`,
      },
      {
        accessorKey: "balance",
        header: "Saldo",
        cell: ({ row }) => {
          const balance = Number(row.original.balance ?? 0);
          if (balance === 0) return "Al día";
          return balance > 0
            ? `Chamba le debe Bs ${balance.toFixed(2)}`
            : `Debe a Chamba Bs ${Math.abs(balance).toFixed(2)}`;
        },
      },
    ],
    [],
  );

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Billetera de Trabajadores</h2>
          <p className="mt-1 text-on-surface-variant">
            Ganancias y comisión de Chamba por periodo
            {commissionPercent != null ? ` (comisión vigente: ${commissionPercent}%)` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={`rounded-full px-3 py-1 text-sm ${period === "day" ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`} onClick={() => setPeriod("day")}>Día</button>
          <button className={`rounded-full px-3 py-1 text-sm ${period === "week" ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`} onClick={() => setPeriod("week")}>Semana</button>
          <button className={`rounded-full px-3 py-1 text-sm ${period === "month" ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`} onClick={() => setPeriod("month")}>Mes</button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="glass-panel rounded-xl p-6"><p className="text-xs uppercase tracking-wider text-on-surface-variant">Ganancia total</p><p className="mt-1 text-2xl font-semibold sm:text-3xl">Bs {totals.totalEarnings.toFixed(2)}</p></div>
        <div className="glass-panel rounded-xl p-6"><p className="text-xs uppercase tracking-wider text-on-surface-variant">Trabajos completados</p><p className="mt-1 text-2xl font-semibold sm:text-3xl">{totals.totalJobs}</p></div>
        <div className="glass-panel rounded-xl p-6"><p className="text-xs uppercase tracking-wider text-on-surface-variant">Comisión Chamba</p><p className="mt-1 text-2xl font-semibold sm:text-3xl">Bs {totals.totalCommission.toFixed(2)}</p></div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <DataTable data={workers} columns={columns} />
      </div>
    </section>
  );
}
