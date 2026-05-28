import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { fetchMapSnapshot } from "@/lib/admin-api";
import type { MapRequest } from "@/lib/types";
import { toast } from "sonner";

export default function RequestsPage() {
  const [items, setItems] = useState<MapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snapshot = await fetchMapSnapshot();
        if (!mounted) return;
        setItems(snapshot.requests || []);
      } catch {
        if (!mounted) return;
        setItems([]);
        toast.error("Error al conectar con el servidor del backend");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo<ColumnDef<MapRequest>[]>(() => [
    { accessorKey: "id", header: "Request ID" },
    { accessorKey: "title", header: "Title" },
    { accessorKey: "clientName", header: "Client" },
    { accessorKey: "status", header: "Status" },
    {
      accessorKey: "budget",
      header: "Budget",
      cell: ({ row }) => `Bs ${Number(row.original.budget).toFixed(2)}`
    }
  ], []);

  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold sm:text-3xl">Requests</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Gestiona las solicitudes de servicio.</p>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-on-surface-variant">Cargando solicitudes...</div>
      ) : (
        <DataTable data={items} columns={columns} />
      )}
    </section>
  );
}
