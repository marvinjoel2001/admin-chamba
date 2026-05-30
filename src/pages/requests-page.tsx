import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { fetchMapSnapshot, adminCancelRequest } from "@/lib/admin-api";
import type { MapRequest } from "@/lib/types";
import { toast } from "sonner";
import { Search, Calendar, X, Eye, ShieldAlert, MapPin, DollarSign, User } from "lucide-react";

const statusLabel: Record<string, string> = {
  searching: "Buscando",
  negotiating: "Negociando",
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
  pending: "Pendiente",
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  searching: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  negotiating: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
  assigned: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  in_progress: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  completed: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  cancelled: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
  pending: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" },
};

function statusBadge(status: string) {
  const colors = statusColors[status] || statusColors.pending;
  return (
    <span className={`inline-flex items-center rounded-full border ${colors.border} ${colors.bg} px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${colors.text}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

export default function RequestsPage() {
  const [items, setItems] = useState<MapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Filtros ---
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Estados de Modal y Acción ---
  const [selectedRequest, setSelectedRequest] = useState<MapRequest | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const snapshot = await fetchMapSnapshot();
      // Ordenamos para que los más recientes salgan primero (según updatedAt)
      const sorted = (snapshot.requests || []).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setItems(sorted);
    } catch {
      setItems([]);
      toast.error("Error al conectar con el servidor del backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("¿Está seguro que desea cancelar este trabajo de forma administrativa? Esta acción es irreversible.")) return;
    setCancellingId(requestId);
    try {
      await adminCancelRequest(requestId);
      toast.success("Trabajo cancelado exitosamente");
      // Sincronizar en la lista local
      setItems((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled", updatedAt: new Date().toISOString() } : r))
      );
      // Sincronizar modal si está abierto
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest((prev) => prev ? { ...prev, status: "cancelled", updatedAt: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error("Error al cancelar solicitud", err);
      toast.error("No se pudo cancelar el trabajo en el backend");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      // Búsqueda por texto
      const clientName = r.clientName ? r.clientName.toLowerCase() : "";
      const matchesSearch = searchQuery.trim() === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.includes(searchQuery.toLowerCase()) ||
        r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
        
      if (!matchesSearch) return false;
      
      // Rango de fechas
      if (startDate) {
        const start = new Date(startDate);
        const itemDate = new Date(r.updatedAt);
        start.setHours(0,0,0,0);
        itemDate.setHours(0,0,0,0);
        if (itemDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        const itemDate = new Date(r.updatedAt);
        end.setHours(23,59,59,999);
        itemDate.setHours(0,0,0,0);
        if (itemDate > end) return false;
      }
      
      return true;
    });
  }, [items, searchQuery, startDate, endDate]);

  const columns = useMemo<ColumnDef<MapRequest>[]>(() => [
    { 
      accessorKey: "id", 
      header: "ID Trabajo",
      cell: ({ row }) => (
        <button 
          onClick={() => setSelectedRequest(row.original)}
          className="font-mono text-xs text-sky-400 hover:text-sky-300 font-semibold hover:underline"
        >
          {row.original.id.slice(0, 8)}...
        </button>
      )
    },
    { 
      accessorKey: "title", 
      header: "Título",
      cell: ({ row }) => (
        <button 
          onClick={() => setSelectedRequest(row.original)}
          className="font-semibold text-left text-white hover:text-primary hover:underline transition-all"
        >
          {row.original.title}
        </button>
      )
    },
    { accessorKey: "clientName", header: "Cliente" },
    { 
      accessorKey: "status", 
      header: "Estado",
      cell: ({ row }) => statusBadge(row.original.status)
    },
    {
      accessorKey: "budget",
      header: "Presupuesto",
      cell: ({ row }) => <span className="font-semibold text-emerald-400">Bs {Number(row.original.budget).toFixed(2)}</span>
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const r = row.original;
        const isCancelable = !["completed", "cancelled"].includes(r.status);
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRequest(r)}
              className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/15 transition-all flex items-center gap-1"
            >
              <Eye className="h-3 w-3" /> Detalle
            </button>
            {isCancelable && (
              <button
                disabled={cancellingId === r.id}
                onClick={() => handleCancelRequest(r.id)}
                className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/35 border border-rose-500/20 disabled:opacity-50 transition-all"
              >
                {cancellingId === r.id ? "Cancelando..." : "Cancelar"}
              </button>
            )}
          </div>
        );
      }
    }
  ], [cancellingId]);

  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl text-white">Administración de Trabajos</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Gestiona, filtra y cancela las órdenes y solicitudes de Chamba de manera administrativa.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center bg-white/[0.02] border border-white/5 p-4 rounded-xl">
        {/* Caja de Búsqueda */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, título de trabajo, ID..."
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-all"
          />
        </div>

        {/* Filtros de Fecha */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-1.5 bg-black/35 rounded-xl border border-white/10 px-3 py-1.5">
            <label className="text-[9px] text-on-surface-variant/80 uppercase font-semibold">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-white outline-none focus:ring-0 w-28 [color-scheme:dark]"
            />
          </div>
          
          <div className="flex items-center gap-1.5 bg-black/35 rounded-xl border border-white/10 px-3 py-1.5">
            <label className="text-[9px] text-on-surface-variant/80 uppercase font-semibold">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-white outline-none focus:ring-0 w-28 [color-scheme:dark]"
            />
          </div>

          {(searchQuery || startDate || endDate) && (
            <button
              onClick={() => { setSearchQuery(""); setStartDate(""); setEndDate(""); }}
              className="text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 px-3 py-2 rounded-xl transition-all border border-rose-500/20 font-medium"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Datos */}
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant/60 flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          Cargando trabajos de la plataforma...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-black/10">
          <DataTable data={filteredItems} columns={columns} />
        </div>
      )}

      {/* ─── Modal de Ficha de Detalle de Trabajo ─── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117]/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-gradient-to-r from-purple-950/20 to-black/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Detalle de Trabajo</h3>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">ID: {selectedRequest.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Titulo */}
              <div>
                <h4 className="text-xs font-bold tracking-wide uppercase text-on-surface-variant/70 mb-1">Título de la Orden</h4>
                <p className="text-sm font-semibold text-white">{selectedRequest.title}</p>
              </div>

              {/* Grid 2 Columnas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                    <User className="h-3.5 w-3.5" /> Cliente
                  </div>
                  <p className="text-sm font-semibold text-white">{selectedRequest.clientName}</p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                    <DollarSign className="h-3.5 w-3.5" /> Presupuesto
                  </div>
                  <p className="text-sm font-bold text-emerald-400">Bs {Number(selectedRequest.budget).toFixed(2)}</p>
                </div>
              </div>

              {/* Direccion */}
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                  <MapPin className="h-3.5 w-3.5" /> Dirección
                </div>
                <p className="text-xs text-white leading-relaxed">{selectedRequest.address}</p>
              </div>

              {/* Coordenadas y Fecha */}
              <div className="grid grid-cols-2 gap-4 text-xs text-on-surface-variant/80">
                <div>
                  <span className="font-semibold text-gray-400 block mb-0.5">Ubicación exacta</span>
                  <span className="font-mono text-[10px]">📍 {selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-400 block mb-0.5">Última actualización</span>
                  <span>{new Date(selectedRequest.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-xs font-semibold text-gray-400">Estado Actual:</span>
                {statusBadge(selectedRequest.status)}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-between items-center bg-black/20">
              <div>
                {!["completed", "cancelled"].includes(selectedRequest.status) ? (
                  <button
                    disabled={cancellingId === selectedRequest.id}
                    onClick={() => handleCancelRequest(selectedRequest.id)}
                    className="rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/20 px-5 py-2 text-sm font-semibold text-rose-300 disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    {cancellingId === selectedRequest.id ? "Cancelando..." : "Cancelar Trabajo"}
                  </button>
                ) : (
                  <span className="text-xs text-on-surface-variant/40">Este trabajo está cerrado</span>
                )}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
