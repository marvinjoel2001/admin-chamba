import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Check, Clock, Phone, MapPin } from "lucide-react";
import { fetchWorkerLeads, markWorkerLeadContacted } from "@/lib/admin-api";
import type { WorkerLead } from "@/lib/types";

export default function LeadsPage() {
  const [items, setItems] = useState<WorkerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const leads = await fetchWorkerLeads();
        if (mounted) {
          setItems(leads);
        }
      } catch (error) {
        if (mounted) toast.error("Error al obtener los postulantes");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleMarkContacted = async (id: string) => {
    try {
      const updated = await markWorkerLeadContacted(id);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success("Marcado como contactado");
    } catch (error) {
      toast.error("Error al actualizar el estado");
    }
  };

  const filteredItems = items.filter((w) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    return (
      w.fullName.toLowerCase().includes(s) ||
      w.whatsapp.includes(s) ||
      w.city.toLowerCase().includes(s) ||
      w.category.toLowerCase().includes(s)
    );
  });

  const columns: ColumnDef<WorkerLead>[] = [
    {
      accessorKey: "fullName",
      header: "Nombre",
      cell: ({ row }) => <span className="font-medium text-white">{row.original.fullName}</span>,
    },
    {
      accessorKey: "whatsapp",
      header: "WhatsApp",
      cell: ({ row }) => (
        <a
          href={`https://wa.me/${row.original.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Phone className="h-4 w-4" />
          {row.original.whatsapp}
        </a>
      ),
    },
    {
      accessorKey: "city",
      header: "Ciudad",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-on-surface-variant">
          <MapPin className="h-4 w-4 text-sky-400" />
          {row.original.city}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Especialidad",
      cell: ({ row }) => <span className="capitalize">{row.original.category}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de Registro",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) =>
        row.original.isContacted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300 border border-emerald-500/20">
            <Check className="h-3 w-3" /> Contactado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs text-amber-300 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Pendiente
          </span>
        ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) =>
        !row.original.isContacted ? (
          <button
            onClick={() => handleMarkContacted(row.original.id)}
            className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors"
          >
            Marcar Contactado
          </button>
        ) : (
          <span className="text-xs text-on-surface-variant italic">Completado</span>
        ),
    },
  ];

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Postulantes (Leads)</h2>
        <p className="mt-1 text-on-surface-variant">
          Trabajadores registrados desde la landing page web esperando ser contactados.
        </p>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-white/5 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2"
            placeholder="Buscar por nombre, WhatsApp, ciudad o especialidad..."
          />
        </div>
        {loading ? (
          <div className="p-6 text-sm text-on-surface-variant">Cargando postulantes...</div>
        ) : (
          <DataTable data={filteredItems} columns={columns} />
        )}
      </div>
    </section>
  );
}
