import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { fetchMapSnapshot, adminCancelRequest, fetchRequestDetail, fetchRequestNotifiedWorkers } from "@/lib/admin-api";
import type { MapRequest, RequestDetail, NotifiedWorker } from "@/lib/types";
import { toast } from "sonner";
import { Search, Calendar, X, Eye, MapPin, DollarSign, User, Users, CheckCircle, Handshake, Clock, MapPinCheck, CircleCheck, Ban, FileText, Briefcase, LayoutGrid, Table as TableIcon, Bell, Star, ImageOff, Send } from "lucide-react";

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

  // --- Modo de vista (tabla | galería marketplace) ---
  const [viewMode, setViewMode] = useState<"table" | "gallery">("table");

  // --- Estados de Modal y Acción ---
  const [selectedRequest, setSelectedRequest] = useState<MapRequest | null>(null);
  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // --- Workers notificados (a quién le llegó la solicitud) ---
  const [notifiedWorkers, setNotifiedWorkers] = useState<NotifiedWorker[]>([]);
  const [loadingNotified, setLoadingNotified] = useState(false);
  const [notifiedSearch, setNotifiedSearch] = useState("");

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
        setRequestDetail((prev) => prev ? { ...prev, status: "cancelled", cancelledAt: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error("Error al cancelar solicitud", err);
      toast.error("No se pudo cancelar el trabajo en el backend");
    } finally {
      setCancellingId(null);
    }
  };

  // Load request detail when modal opens
  useEffect(() => {
    if (selectedRequest) {
      setLoadingDetail(true);
      fetchRequestDetail(selectedRequest.id)
        .then((detail) => {
          setRequestDetail(detail);
        })
        .catch(() => {
          // Fallback to basic info if API fails
          setRequestDetail({
            ...selectedRequest,
            timeline: generateTimeline(selectedRequest),
          } as RequestDetail);
        })
        .finally(() => {
          setLoadingDetail(false);
        });

      // Cargar workers a los que se les envió la notificación de esta solicitud
      setLoadingNotified(true);
      setNotifiedSearch("");
      fetchRequestNotifiedWorkers(selectedRequest.id)
        .then((res) => setNotifiedWorkers(res.workers))
        .catch(() => setNotifiedWorkers([]))
        .finally(() => setLoadingNotified(false));
    } else {
      setRequestDetail(null);
      setNotifiedWorkers([]);
    }
  }, [selectedRequest]);

  // Generate timeline from request data
  function generateTimeline(req: MapRequest) {
    const timeline = [];
    
    // Created
    timeline.push({
      stage: "created",
      label: "Solicitud Creada",
      timestamp: req.createdAt || req.updatedAt,
      icon: "FileText",
      completed: true,
    });
    
    // Negotiating or Assigned
    if (req.assignedAt || req.status !== "searching") {
      timeline.push({
        stage: "negotiating",
        label: "Negociación / Asignación",
        timestamp: req.assignedAt,
        icon: "Handshake",
        completed: true,
      });
    }
    
    // Worker Arrived
    if (req.workerArrivedAt || ["in_progress", "completed"].includes(req.status)) {
      timeline.push({
        stage: "worker_arrived",
        label: "Trabajador Llegó",
        timestamp: req.workerArrivedAt,
        icon: "MapPinCheck",
        completed: !!req.workerArrivedAt,
      });
    }
    
    // Client Confirmed
    if (req.clientConfirmedArrivalAt || ["in_progress", "completed"].includes(req.status)) {
      timeline.push({
        stage: "client_confirmed",
        label: "Cliente Confirmó Llegada",
        timestamp: req.clientConfirmedArrivalAt,
        icon: "CheckCircle",
        completed: !!req.clientConfirmedArrivalAt,
      });
    }
    
    // Completed or Cancelled
    if (req.status === "completed" && req.completedAt) {
      timeline.push({
        stage: "completed",
        label: "Trabajo Completado",
        timestamp: req.completedAt,
        icon: "CircleCheck",
        completed: true,
      });
    } else if (req.status === "cancelled" && req.cancelledAt) {
      timeline.push({
        stage: "cancelled",
        label: "Trabajo Cancelado",
        timestamp: req.cancelledAt,
        icon: "Ban",
        completed: true,
      });
    }
    
    return timeline;
  }

  // Format duration
  function formatDuration(minutes?: number): string {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  // Timeline icon component
  function TimelineIcon({ icon, completed }: { icon: string; completed: boolean }) {
    const className = `h-5 w-5 ${completed ? "text-primary" : "text-on-surface-variant/40"}`;
    switch (icon) {
      case "FileText": return <FileText className={className} />;
      case "Handshake": return <Handshake className={className} />;
      case "MapPinCheck": return <MapPinCheck className={className} />;
      case "CheckCircle": return <CheckCircle className={className} />;
      case "CircleCheck": return <CircleCheck className={className} />;
      case "Ban": return <Ban className={className} />;
      default: return <Clock className={className} />;
    }
  }

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

        {/* Switch de tipo de vista */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 shrink-0">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "table" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white hover:bg-white/5"
            }`}
          >
            <TableIcon className="h-4 w-4" /> Tabla
          </button>
          <button
            onClick={() => setViewMode("gallery")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "gallery" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Galería
          </button>
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
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-black/10">
          <DataTable data={filteredItems} columns={columns} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-12 text-center text-sm text-on-surface-variant/60">
          No se encontraron trabajos con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRequest(r)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition-all hover:border-primary/40 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Foto */}
              <div className="relative h-40 w-full overflow-hidden bg-black/40">
                {r.photoUrl ? (
                  <img
                    src={r.photoUrl}
                    alt={r.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-on-surface-variant/30">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-[10px]">Sin foto</span>
                  </div>
                )}
                <div className="absolute right-2 top-2">{statusBadge(r.status)}</div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <span className="text-base font-bold text-emerald-400">Bs {Number(r.budget).toFixed(2)}</span>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-primary transition-colors">{r.title}</h3>
                <div className="mt-auto space-y-1.5 pt-1 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/60" />
                    <span className="truncate">{r.clientName || "Cliente desconocido"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/60" />
                    <span>{new Date(r.createdAt || r.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Modal de Ficha de Detalle de Trabajo ─── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1117]/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-gradient-to-r from-purple-950/20 to-black/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <Briefcase className="h-5 w-5" />
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
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Titulo */}
                  <div>
                    <h4 className="text-xs font-bold tracking-wide uppercase text-on-surface-variant/70 mb-1">Título de la Orden</h4>
                    <p className="text-sm font-semibold text-white">{selectedRequest.title}</p>
                  </div>

                  {/* Grid: Cliente, Worker, Presupuesto, Duración */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                        <User className="h-3.5 w-3.5" /> Cliente
                      </div>
                      <p className="text-sm font-semibold text-white">{selectedRequest.clientName}</p>
                      {requestDetail?.client?.phone && (
                        <p className="text-xs text-on-surface-variant/60 mt-0.5">{requestDetail.client.phone}</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                        <Users className="h-3.5 w-3.5" /> Trabajador Asignado
                      </div>
                      {selectedRequest.workerName ? (
                        <>
                          <p className="text-sm font-semibold text-white">{selectedRequest.workerName}</p>
                          {requestDetail?.worker?.phone && (
                            <p className="text-xs text-on-surface-variant/60 mt-0.5">{requestDetail.worker.phone}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-on-surface-variant/50 italic">Sin asignar</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                        <DollarSign className="h-3.5 w-3.5" /> Presupuesto
                      </div>
                      <p className="text-sm font-bold text-emerald-400">Bs {Number(selectedRequest.budget).toFixed(2)}</p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-1">
                        <Clock className="h-3.5 w-3.5" /> Duración del Trabajo
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {selectedRequest.durationMinutes ? formatDuration(selectedRequest.durationMinutes) : "-"}
                      </p>
                      {selectedRequest.completedAt && (
                        <p className="text-xs text-on-surface-variant/60 mt-0.5">
                          Completado: {new Date(selectedRequest.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Direccion */}
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                      <MapPin className="h-3.5 w-3.5" /> Dirección
                    </div>
                    <p className="text-xs text-white leading-relaxed">{selectedRequest.address}</p>
                  </div>

                  {/* Timeline */}
                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-xs font-bold tracking-wide uppercase text-on-surface-variant/70 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Timeline del Trabajo
                    </h4>
                    <div className="space-y-3">
                      {(requestDetail?.timeline || generateTimeline(selectedRequest)).map((item, index, arr) => {
                        const isLast = index === arr.length - 1;
                        return (
                          <div key={item.stage} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                item.completed 
                                  ? "border-primary bg-primary/20 text-primary" 
                                  : "border-white/10 bg-white/5 text-on-surface-variant/40"
                              }`}>
                                <TimelineIcon icon={item.icon} completed={item.completed} />
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 flex-1 my-1 ${
                                  item.completed ? "bg-primary/30" : "bg-white/10"
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <p className={`text-sm font-semibold ${
                                item.completed ? "text-white" : "text-on-surface-variant/50"
                              }`}>
                                {item.label}
                              </p>
                              {item.timestamp && (
                                <p className="text-xs text-on-surface-variant/60 mt-0.5">
                                  {new Date(item.timestamp).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workers Notificados */}
                  <div className="border-t border-white/5 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant/70">
                        <Bell className="h-4 w-4" /> Workers Notificados
                      </h4>
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                        {loadingNotified ? "..." : `${notifiedWorkers.length} avisados`}
                      </span>
                    </div>
                    <p className="mb-3 text-[11px] text-on-surface-variant/60">
                      Trabajadores a los que se les envió la notificación de esta solicitud (orden de envío).
                    </p>

                    {/* Buscador */}
                    {notifiedWorkers.length > 0 && (
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
                        <input
                          type="text"
                          value={notifiedSearch}
                          onChange={(e) => setNotifiedSearch(e.target.value)}
                          placeholder="Buscar worker notificado..."
                          className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-white placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    )}

                    {loadingNotified ? (
                      <div className="flex justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : notifiedWorkers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-center text-xs text-on-surface-variant/50">
                        No hay registro de workers notificados para esta solicitud.
                      </div>
                    ) : (() => {
                      const term = notifiedSearch.trim().toLowerCase();
                      const filtered = notifiedWorkers.filter((w) =>
                        term === "" || `${w.firstName} ${w.lastName}`.toLowerCase().includes(term)
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-center text-xs text-on-surface-variant/50">
                            Ningún worker coincide con "{notifiedSearch}".
                          </div>
                        );
                      }
                      return (
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {filtered.map((w, i) => {
                            const offerColors: Record<string, string> = {
                              pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
                              accepted: "bg-green-500/15 text-green-300 border-green-500/20",
                              rejected: "bg-rose-500/15 text-rose-300 border-rose-500/20",
                              expired: "bg-gray-500/15 text-gray-300 border-gray-500/20",
                            };
                            return (
                              <div key={w.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  {i + 1}
                                </span>
                                <img
                                  src={w.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"}
                                  alt={w.firstName}
                                  className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-white">{w.firstName} {w.lastName}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60">
                                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400" /> {w.averageRating.toFixed(1)}</span>
                                    <span>·</span>
                                    <span>{w.completedJobs} trabajos</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/70">
                                    <Send className="h-3 w-3" />
                                    {new Date(w.notifiedAt).toLocaleString()}
                                  </span>
                                  {w.offerStatus && (
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase ${offerColors[w.offerStatus] ?? offerColors.expired}`}>
                                      {w.offerStatus === "accepted" ? "Ofertó · aceptado" : w.offerStatus === "pending" ? "Ofertó" : w.offerStatus === "rejected" ? "Ofertó · rechazado" : w.offerStatus}
                                      {w.offerAmount != null ? ` · Bs ${w.offerAmount.toFixed(0)}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs font-semibold text-gray-400">Estado Actual:</span>
                    {statusBadge(selectedRequest.status)}
                  </div>
                </>
              )}
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
