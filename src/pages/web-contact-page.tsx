import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Check, Clock } from "lucide-react";
import { fetchWebContact, markWebContactHandled } from "@/lib/admin-api";
import type { WebContactMessage } from "@/lib/types";
import { websocketService } from "@/lib/websocket-service";

const CATEGORY_LABELS: Record<string, string> = {
  usuario: "Comportamiento de un usuario",
  estafa: "Posible estafa o fraude",
  bug: "Falla técnica",
  otro: "Otro",
};

/** Lo que llega desde la landing: reportes de "Reportar un problema" y suscriptores. */
export default function WebContactPage() {
  const [kind, setKind] = useState<"report" | "subscribe">("report");
  const [items, setItems] = useState<WebContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchWebContact(kind)
      .then((rows) => mounted && setItems(rows))
      .catch(() => mounted && toast.error("No se pudo cargar la bandeja web"))
      .finally(() => mounted && setLoading(false));

    const socket = websocketService.getSocket();
    const onNew = (payload: { kind?: string }) => {
      if (payload?.kind !== kind) return;
      fetchWebContact(kind).then((rows) => mounted && setItems(rows)).catch(() => undefined);
      if (payload.kind === "report") toast.info("Nuevo reporte desde la web");
    };
    socket?.on("web_contact.new", onNew);
    return () => {
      mounted = false;
      socket?.off("web_contact.new", onNew);
    };
  }, [kind]);

  const handle = async (id: string) => {
    try {
      const { handledAt } = await markWebContactHandled(id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, handledAt } : item)));
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const columns: ColumnDef<WebContactMessage>[] = [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("es-BO"),
    },
    {
      accessorKey: "email",
      header: "Correo",
      cell: ({ row }) => (
        <a href={`mailto:${row.original.email}`} className="text-sky-300 hover:underline">
          {row.original.email}
        </a>
      ),
    },
    ...(kind === "report"
      ? ([
          {
            accessorKey: "category",
            header: "Tipo",
            cell: ({ row }) => CATEGORY_LABELS[row.original.category ?? ""] ?? row.original.category ?? "—",
          },
          {
            accessorKey: "message",
            header: "Descripción",
            cell: ({ row }) => <p className="max-w-md whitespace-pre-wrap text-sm">{row.original.message}</p>,
          },
          {
            id: "status",
            header: "Estado",
            cell: ({ row }) =>
              row.original.handledAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">
                  <Check className="h-3 w-3" /> Atendido
                </span>
              ) : (
                <button
                  onClick={() => handle(row.original.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/30"
                >
                  <Clock className="h-3 w-3" /> Marcar atendido
                </button>
              ),
          },
        ] as ColumnDef<WebContactMessage>[])
      : []),
  ];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes web</h2>
          <p className="mt-1 text-on-surface-variant">Reportes y suscripciones enviados desde la landing.</p>
        </div>
        <div className="flex gap-2">
          {(["report", "subscribe"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setKind(value)}
              className={`rounded-full px-3 py-1 text-sm ${kind === value ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`}
            >
              {value === "report" ? "Reportes" : "Suscriptores"}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-panel overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-6 text-sm text-on-surface-variant">Cargando…</div>
        ) : (
          <DataTable data={items} columns={columns} />
        )}
      </div>
    </section>
  );
}
