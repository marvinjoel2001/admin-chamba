import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { fetchMapSnapshot, adminCancelRequest, fetchRequestDetail, fetchRequestNotifiedWorkers } from "@/lib/admin-api";
import type { MapRequest, RequestDetail, NotifiedWorker, RequestOfferItem } from "@/lib/types";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";
import {
  Search,
  Calendar,
  X,
  Eye,
  MapPin,
  DollarSign,
  User,
  Users,
  CheckCircle,
  Handshake,
  Clock,
  MapPinCheck,
  CircleCheck,
  Ban,
  FileText,
  Briefcase,
  LayoutGrid,
  Table as TableIcon,
  Bell,
  Star,
  ImageOff,
  Send,
  AlertTriangle,
  Layers,
  MessageSquare,
  Building2,
  Phone,
  Timer,
  ChevronRight,
} from "lucide-react";

type StatusFilter = "all" | "stagnant" | "searching" | "negotiating" | "assigned" | "in_progress" | "completed" | "cancelled";
type ModalTab = "overview" | "notified" | "offers" | "timeline";

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
  searching: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  negotiating: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  assigned: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  in_progress: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  cancelled: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
  pending: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" },
};

function statusBadge(status: string) {
  const colors = statusColors[status] || statusColors.pending;
  return (
    <span className={`inline-flex items-center rounded-full border ${colors.border} ${colors.bg} px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${colors.text}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

function timeSince(dateString?: string): string {
  if (!dateString) return "-";
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < 0) return "Hace un momento";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Hace unos segundos";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h ${mins % 60} m`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

function isStagnant(request: MapRequest): boolean {
  if (!["searching", "negotiating", "pending"].includes(request.status)) return false;
  const createdDate = new Date(request.createdAt || request.updatedAt).getTime();
  const elapsedMinutes = (Date.now() - createdDate) / 60000;
  return elapsedMinutes >= 15; // Más de 15 minutos sin ser asignado
}

export default function RequestsPage() {
  const [items, setItems] = useState<MapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Filtros ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Modo de vista (tabla | galería marketplace) ---
  const [viewMode, setViewMode] = useState<"table" | "gallery">("table");

  // --- Estados de Modal y Acción ---
  const [selectedRequest, setSelectedRequest] = useState<MapRequest | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("overview");
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
      setItems((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled", updatedAt: new Date().toISOString() } : r))
      );
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
      setModalTab("overview");
      fetchRequestDetail(selectedRequest.id)
        .then((detail) => {
          setRequestDetail(detail);
        })
        .catch(() => {
          setRequestDetail({
            id: selectedRequest.id,
            title: selectedRequest.title,
            status: selectedRequest.status,
            budget: selectedRequest.budget,
            address: selectedRequest.address,
            latitude: selectedRequest.latitude,
            longitude: selectedRequest.longitude,
            createdAt: selectedRequest.createdAt || selectedRequest.updatedAt,
            updatedAt: selectedRequest.updatedAt,
            client: {
              id: selectedRequest.clientId || "",
              firstName: selectedRequest.clientName?.split(" ")[0] || "Cliente",
              lastName: selectedRequest.clientName?.split(" ").slice(1).join(" ") || "",
              averageRating: 5.0,
            },
            worker: selectedRequest.workerName
              ? {
                  id: selectedRequest.workerId || "",
                  firstName: selectedRequest.workerName?.split(" ")[0] || "Worker",
                  lastName: selectedRequest.workerName?.split(" ").slice(1).join(" ") || "",
                  averageRating: 5.0,
                  completedJobs: 0,
                }
              : null,
            timeline: generateTimeline(selectedRequest),
          } as RequestDetail);
        })
        .finally(() => {
          setLoadingDetail(false);
        });

      // Cargar workers notificados
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

  // Generate timeline fallback from request data
  function generateTimeline(req: MapRequest) {
    const timeline = [];
    timeline.push({
      stage: "created",
      label: "Solicitud Publicada",
      timestamp: req.createdAt || req.updatedAt,
      icon: "FileText",
      completed: true,
    });
    if (req.assignedAt || req.status !== "searching") {
      timeline.push({
        stage: "negotiating",
        label: "Negociación / Ofertas",
        timestamp: req.assignedAt,
        icon: "Handshake",
        completed: true,
      });
    }
    if (req.workerArrivedAt || ["in_progress", "completed"].includes(req.status)) {
      timeline.push({
        stage: "worker_arrived",
        label: "Trabajador Llegó al Lugar",
        timestamp: req.workerArrivedAt,
        icon: "MapPinCheck",
        completed: !!req.workerArrivedAt,
      });
    }
    if (req.clientConfirmedArrivalAt || ["in_progress", "completed"].includes(req.status)) {
      timeline.push({
        stage: "client_confirmed",
        label: "Cliente Confirmó Inicio",
        timestamp: req.clientConfirmedArrivalAt,
        icon: "CheckCircle",
        completed: !!req.clientConfirmedArrivalAt,
      });
    }
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

  function formatDuration(minutes?: number): string {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

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

  // Counts for top quick filter chips
  const counts = useMemo(() => {
    let stagnantCount = 0;
    let searchingCount = 0;
    let negotiatingCount = 0;
    let assignedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    items.forEach((r) => {
      if (isStagnant(r)) stagnantCount++;
      if (r.status === "searching") searchingCount++;
      if (r.status === "negotiating") negotiatingCount++;
      if (r.status === "assigned") assignedCount++;
      if (r.status === "in_progress") inProgressCount++;
      if (r.status === "completed") completedCount++;
      if (r.status === "cancelled") cancelledCount++;
    });

    return {
      all: items.length,
      stagnant: stagnantCount,
      searching: searchingCount,
      negotiating: negotiatingCount,
      assigned: assignedCount,
      in_progress: inProgressCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      // Filtro por Estado / Estancados
      if (statusFilter === "stagnant" && !isStagnant(r)) return false;
      if (statusFilter !== "all" && statusFilter !== "stagnant" && r.status !== statusFilter) return false;

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
  }, [items, statusFilter, searchQuery, startDate, endDate]);

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
      cell: ({ row }) => {
        const r = row.original;
        const stagnant = isStagnant(r);
        return (
          <div className="flex flex-col items-start gap-1">
            <button 
              onClick={() => setSelectedRequest(r)}
              className="font-semibold text-left text-on-surface hover:text-primary hover:underline transition-all"
            >
              {r.title}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant font-mono">
                🕒 {timeSince(r.createdAt || r.updatedAt)}
              </span>
              {stagnant && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                  <AlertTriangle size={10} /> Sin Aceptar
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    { 
      accessorKey: "clientName", 
      header: "Cliente",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-on-surface">
          {row.original.clientName || "Cliente"}
        </span>
      )
    },
    { 
      accessorKey: "status", 
      header: "Estado",
      cell: ({ row }) => statusBadge(row.original.status)
    },
    {
      accessorKey: "budget",
      header: "Presupuesto",
      cell: ({ row }) => <span className="font-bold text-emerald-400">Bs {Number(row.original.budget).toFixed(2)}</span>
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
              className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-on-surface hover:bg-white/15 transition-all flex items-center gap-1.5 font-medium"
            >
              <Eye className="h-3.5 w-3.5" /> Detalle
            </button>
            {isCancelable && (
              <button
                disabled={cancellingId === r.id}
                onClick={() => handleCancelRequest(r.id)}
                className="rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/25 border border-rose-500/25 disabled:opacity-50 transition-all font-medium"
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
    <section className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl text-on-surface">Administración de Trabajos</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Supervisa el estado de difusión, negociaciones por hora/día/precio fijo y trabajos estancados.
          </p>
        </div>

        {/* Switch de tipo de vista */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 shrink-0">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "table" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
            }`}
          >
            <TableIcon className="h-4 w-4" /> Tabla
          </button>
          <button
            onClick={() => setViewMode("gallery")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "gallery" ? "bg-primary text-white shadow" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Galería
          </button>
        </div>
      </div>

      {/* Chips de Estado y Trabajos Estancados */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "all"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          Todos ({counts.all})
        </button>

        {/* Botón especial para trabajos sin aceptar / estancados */}
        <button
          onClick={() => setStatusFilter("stagnant")}
          className={`relative rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            statusFilter === "stagnant"
              ? "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          }`}
        >
          <AlertTriangle size={13} className={counts.stagnant > 0 ? "animate-pulse" : ""} />
          ⏳ Sin Aceptar / Estancados ({counts.stagnant})
          {counts.stagnant > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          )}
        </button>

        <button
          onClick={() => setStatusFilter("searching")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "searching"
              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          🔍 Buscando ({counts.searching})
        </button>

        <button
          onClick={() => setStatusFilter("negotiating")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "negotiating"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          🤝 Negociando ({counts.negotiating})
        </button>

        <button
          onClick={() => setStatusFilter("assigned")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "assigned"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          🚗 Asignados ({counts.assigned})
        </button>

        <button
          onClick={() => setStatusFilter("in_progress")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "in_progress"
              ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          🔨 En Progreso ({counts.in_progress})
        </button>

        <button
          onClick={() => setStatusFilter("completed")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "completed"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          ✅ Completados ({counts.completed})
        </button>

        <button
          onClick={() => setStatusFilter("cancelled")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
            statusFilter === "cancelled"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
        >
          ❌ Cancelados ({counts.cancelled})
        </button>
      </div>

      {/* Barra de Filtros & Búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-black/20 border border-white/5 p-4 rounded-xl">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, título de trabajo, ID, dirección..."
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-all"
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
              className="bg-transparent border-none text-xs text-on-surface outline-none focus:ring-0 w-28"
            />
          </div>
          
          <div className="flex items-center gap-1.5 bg-black/35 rounded-xl border border-white/10 px-3 py-1.5">
            <label className="text-[9px] text-on-surface-variant/80 uppercase font-semibold">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-on-surface outline-none focus:ring-0 w-28"
            />
          </div>

          {(searchQuery || startDate || endDate || statusFilter !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setStartDate(""); setEndDate(""); setStatusFilter("all"); }}
              className="text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 px-3 py-2 rounded-xl transition-all border border-rose-500/20 font-medium"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Vista de Datos */}
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant/60 flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          Cargando solicitudes y trabajos de la plataforma...
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
          {filteredItems.map((r) => {
            const stagnant = isStagnant(r);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRequest(r)}
                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all hover:shadow-xl ${
                  stagnant
                    ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-400/60"
                    : "border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.05]"
                }`}
              >
                {/* Foto o Header */}
                <div className="relative h-36 w-full overflow-hidden bg-black/40">
                  {r.photoUrl ? (
                    <img
                      src={r.photoUrl}
                      alt={r.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-on-surface-variant/30">
                      <ImageOff className="h-7 w-7" />
                      <span className="text-[10px]">Sin foto</span>
                    </div>
                  )}
                  <div className="absolute right-2 top-2">{statusBadge(r.status)}</div>
                  {stagnant && (
                    <div className="absolute left-2 top-2 rounded-full bg-amber-500/90 text-black px-2 py-0.5 text-[9px] font-extrabold uppercase shadow-md flex items-center gap-1">
                      <AlertTriangle size={10} /> Sin Asignar
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400">Bs {Number(r.budget).toFixed(2)}</span>
                    <span className="text-[10px] text-white/70 font-mono">{timeSince(r.createdAt || r.updatedAt)}</span>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <h3 className="line-clamp-2 text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{r.title}</h3>
                  <p className="line-clamp-1 text-xs text-on-surface-variant">{r.address}</p>
                  
                  <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span className="truncate font-medium">👤 {r.clientName || "Cliente"}</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      Ver <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Modal de Ficha de Detalle de Trabajo Completo ─── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#120f1a] shadow-2xl backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-purple-950/40 to-black/60">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">{selectedRequest.title}</h3>
                    {statusBadge(selectedRequest.status)}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 font-mono">
                    ID: {selectedRequest.id} · Publicado: {timeSince(selectedRequest.createdAt || selectedRequest.updatedAt)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-tabs del Modal */}
            <div className="flex items-center gap-1 border-b border-white/10 bg-black/40 px-6 py-2">
              <button
                onClick={() => setModalTab("overview")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  modalTab === "overview"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Layers size={14} /> Resumen & Modalidad
              </button>
              <button
                onClick={() => setModalTab("notified")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  modalTab === "notified"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Bell size={14} /> Difusión ({notifiedWorkers.length})
              </button>
              <button
                onClick={() => setModalTab("offers")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  modalTab === "offers"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Handshake size={14} /> Ofertas ({requestDetail?.offers?.length ?? 0})
              </button>
              <button
                onClick={() => setModalTab("timeline")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  modalTab === "timeline"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Clock size={14} /> Línea de Tiempo
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/50 text-xs">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Cargando información completa del trabajo...
                </div>
              ) : (
                <>
                  {/* TAB: RESUMEN Y MODALIDAD */}
                  {modalTab === "overview" && (
                    <div className="space-y-4">
                      {/* Alerta si está estancado */}
                      {isStagnant(selectedRequest) && (
                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">Trabajo Sin Aceptar por Mucho Tiempo</h4>
                            <p className="text-xs text-amber-200/80 mt-0.5">
                              Esta solicitud lleva <strong>{timeSince(selectedRequest.createdAt || selectedRequest.updatedAt)}</strong> sin un trabajador asignado.
                              Revisa la pestaña de <strong>Difusión</strong> para ver cuántos workers fueron avisados y <strong>Ofertas</strong> para ver quiénes negociaron.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Modalidad de Trabajo & Presupuesto */}
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Modalidad de Cobro</span>
                          <span className="rounded-lg bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
                            {requestDetail?.modality === "hourly"
                              ? "⏱️ Por Hora"
                              : requestDetail?.modality === "daily"
                              ? "📅 Por Día"
                              : "💰 Precio Fijo / Por Trabajo"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="rounded-xl bg-white/5 p-3">
                            <span className="text-white/50 block text-[10px] uppercase font-semibold">Presupuesto Total Acordado</span>
                            <p className="text-lg font-black text-emerald-400 mt-0.5">
                              Bs {Number(selectedRequest.budget).toFixed(2)}
                            </p>
                          </div>

                          {requestDetail?.modality === "hourly" && (
                            <>
                              <div className="rounded-xl bg-white/5 p-3">
                                <span className="text-white/50 block text-[10px] uppercase font-semibold">Tarifa por Hora</span>
                                <p className="text-base font-bold text-white mt-0.5">
                                  Bs {requestDetail.hourlyRate?.toFixed(2) || "0.00"} / hr
                                </p>
                              </div>
                              <div className="rounded-xl bg-white/5 p-3">
                                <span className="text-white/50 block text-[10px] uppercase font-semibold">Horas Estimadas</span>
                                <p className="text-base font-bold text-white mt-0.5">
                                  {requestDetail.estimatedHours || 0} horas
                                </p>
                              </div>
                            </>
                          )}

                          {requestDetail?.modality === "daily" && (
                            <>
                              <div className="rounded-xl bg-white/5 p-3">
                                <span className="text-white/50 block text-[10px] uppercase font-semibold">Tarifa Diaria</span>
                                <p className="text-base font-bold text-white mt-0.5">
                                  Bs {requestDetail.dailyRate?.toFixed(2) || "0.00"} / día
                                </p>
                              </div>
                              <div className="rounded-xl bg-white/5 p-3">
                                <span className="text-white/50 block text-[10px] uppercase font-semibold">Días Estimados</span>
                                <p className="text-base font-bold text-white mt-0.5">
                                  {requestDetail.days || 0} días
                                </p>
                              </div>
                            </>
                          )}

                          {(!requestDetail?.modality || requestDetail?.modality === "fixed") && (
                            <div className="col-span-2 rounded-xl bg-white/5 p-3 flex items-center justify-between">
                              <span className="text-white/50 text-xs">Método de Pago:</span>
                              <span className="font-semibold text-white">{requestDetail?.paymentMethod || "Efectivo"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cliente y Trabajador Asignado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                              <User size={14} className="text-sky-400" /> Cliente
                            </span>
                            <span className="text-[10px] text-sky-300 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                              ⭐ {requestDetail?.client?.averageRating?.toFixed(1) || "5.0"}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white">
                            {requestDetail?.client ? `${requestDetail.client.firstName} ${requestDetail.client.lastName}` : selectedRequest.clientName}
                          </p>
                          {requestDetail?.client?.phone && (
                            <p className="text-xs text-white/60 mt-1 flex items-center gap-1 font-mono">
                              <Phone size={12} /> {requestDetail.client.phone}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                              <Users size={14} className="text-purple-400" /> Trabajador Asignado
                            </span>
                            {requestDetail?.worker && (
                              <span className="text-[10px] text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                ⭐ {requestDetail.worker.averageRating?.toFixed(1) || "5.0"}
                              </span>
                            )}
                          </div>
                          {requestDetail?.worker ? (
                            <div>
                              <p className="text-sm font-bold text-white">
                                {requestDetail.worker.firstName} {requestDetail.worker.lastName}
                              </p>
                              {requestDetail.worker.phone && (
                                <p className="text-xs text-white/60 mt-1 flex items-center gap-1 font-mono">
                                  <Phone size={12} /> {requestDetail.worker.phone}
                                </p>
                              )}
                              <p className="text-[11px] text-emerald-400 mt-1">
                                {requestDetail.workerArrived ? "✅ Ya llegó al lugar del trabajo" : "🚗 En camino hacia la ubicación"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-300/80 italic bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                              ⚠️ Aún no se ha aceptado ni asignado ningún trabajador a esta orden.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dirección y Ubicación */}
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                          <MapPin size={14} className="text-rose-400" /> Dirección del Trabajo
                        </span>
                        <p className="text-xs text-white leading-relaxed">{selectedRequest.address}</p>
                        <p className="text-[10px] text-white/40 font-mono">
                          Coordenadas: 📍 {selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}
                        </p>
                      </div>

                      {/* Descripción de la Solicitud */}
                      {requestDetail?.description && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-400" /> Descripción del Cliente
                          </span>
                          <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{requestDetail.description}</p>
                        </div>
                      )}

                      {/* Fotos si existen */}
                      {requestDetail?.photos && requestDetail.photos.length > 0 && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Fotos Adjuntas ({requestDetail.photos.length})</span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {requestDetail.photos.map((p) => (
                              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="shrink-0">
                                <img src={p.url} alt="Foto trabajo" className="h-20 w-20 rounded-xl object-cover border border-white/10 hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: TRABAJADORES NOTIFICADOS / DIFUSIÓN */}
                  {modalTab === "notified" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Difusión de Notificaciones</h4>
                          <p className="text-xs text-white/50">
                            Trabajadores que recibieron la alerta push / socket en su celular cuando se publicó el trabajo.
                          </p>
                        </div>
                        <span className="rounded-xl bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
                          {notifiedWorkers.length} workers avisados
                        </span>
                      </div>

                      {notifiedWorkers.length > 0 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                          <input
                            type="text"
                            value={notifiedSearch}
                            onChange={(e) => setNotifiedSearch(e.target.value)}
                            placeholder="Buscar en la lista de notificados por nombre..."
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:outline-none"
                          />
                        </div>
                      )}

                      {loadingNotified ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : notifiedWorkers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-xs text-white/50">
                          No se encontraron notificaciones registradas para esta solicitud.
                        </div>
                      ) : (() => {
                        const term = notifiedSearch.trim().toLowerCase();
                        const filtered = notifiedWorkers.filter((w) =>
                          term === "" || `${w.firstName} ${w.lastName}`.toLowerCase().includes(term)
                        );
                        return (
                          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                            {filtered.map((w, i) => (
                              <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                                    {i + 1}
                                  </span>
                                  <UserAvatar
                                    name={`${w.firstName} ${w.lastName}`}
                                    photoUrl={w.profilePhotoUrl}
                                    size={40}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">{w.firstName} {w.lastName}</p>
                                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                                      <span className="flex items-center gap-0.5 text-amber-400"><Star size={11} /> {w.averageRating.toFixed(1)}</span>
                                      <span>·</span>
                                      <span>{w.completedJobs} trabajos</span>
                                      {w.phone && (
                                        <>
                                          <span>·</span>
                                          <span className="font-mono">{w.phone}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-[10px] text-white/40 font-mono">
                                    {new Date(w.notifiedAt).toLocaleTimeString()}
                                  </span>
                                  {w.offerStatus ? (
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                      w.offerStatus === "accepted"
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : w.offerStatus === "pending"
                                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                    }`}>
                                      {w.offerStatus === "accepted" ? "🎉 Oferta Aceptada" : w.offerStatus === "pending" ? "💼 Envió Oferta" : "Rechazada"}
                                      {w.offerAmount != null ? ` (Bs ${w.offerAmount})` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-white/30 italic">Sin oferta aún</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB: OFERTAS & NEGOCIACIONES */}
                  {modalTab === "offers" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Ofertas y Negociaciones Recibidas</h4>
                          <p className="text-xs text-white/50">
                            Propuestas de precio y mensajes que los trabajadores enviaron para este trabajo.
                          </p>
                        </div>
                        <span className="rounded-xl bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
                          {requestDetail?.offers?.length ?? 0} ofertas totales
                        </span>
                      </div>

                      {(!requestDetail?.offers || requestDetail.offers.length === 0) ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-xs text-white/50 space-y-2">
                          <Handshake className="h-8 w-8 text-white/20 mx-auto" />
                          <p className="font-semibold text-white/70">Aún ningún trabajador ha enviado ofertas para este trabajo.</p>
                          <p className="text-[11px] text-white/40">Los trabajadores notificados pueden ver la solicitud y proponer su precio.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {requestDetail.offers.map((offer: RequestOfferItem, idx: number) => {
                            const isAccepted = offer.status === "accepted";
                            const isPending = offer.status === "pending";
                            return (
                              <div
                                key={offer.id}
                                className={`rounded-2xl border p-4 transition-all ${
                                  isAccepted
                                    ? "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                    : "border-white/10 bg-black/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <UserAvatar
                                      name={offer.workerName}
                                      photoUrl={offer.workerPhoto}
                                      size={44}
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-sm font-bold text-white">{offer.workerName}</h5>
                                        {offer.agencyName && (
                                          <span className="flex items-center gap-1 rounded-md bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                                            <Building2 size={10} /> {offer.agencyName}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5">
                                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                          <Star size={11} /> {offer.workerRating.toFixed(1)}
                                        </span>
                                        <span>·</span>
                                        <span>{offer.workerCompletedJobs} trabajos realizados</span>
                                        {offer.workerPhone && (
                                          <>
                                            <span>·</span>
                                            <span className="font-mono text-white/60">{offer.workerPhone}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-lg font-extrabold text-emerald-400">
                                      Bs {Number(offer.amount).toFixed(2)}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                                      isAccepted
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : isPending
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                    }`}>
                                      {isAccepted ? "✅ Ganadora / Asignado" : isPending ? "⏳ Pendiente" : offer.status}
                                    </span>
                                  </div>
                                </div>

                                {offer.message && (
                                  <div className="mt-3 rounded-xl bg-white/5 border border-white/5 p-2.5 text-xs text-white/80 flex items-start gap-2">
                                    <MessageSquare size={13} className="text-purple-400 shrink-0 mt-0.5" />
                                    <span>"{offer.message}"</span>
                                  </div>
                                )}

                                <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/40 pt-2 border-t border-white/5">
                                  <span>Propuesta enviada: {new Date(offer.createdAt).toLocaleString()}</span>
                                  {offer.expiresAt && (
                                    <span>Vence: {new Date(offer.expiresAt).toLocaleTimeString()}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: LÍNEA DE TIEMPO */}
                  {modalTab === "timeline" && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Línea de Tiempo del Trabajo</h4>
                        <p className="text-xs text-white/50">
                          Registro cronológico de los eventos del trabajo desde su publicación.
                        </p>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
                        {(requestDetail?.timeline || generateTimeline(selectedRequest)).map((item, index, arr) => {
                          const isLast = index === arr.length - 1;
                          return (
                            <div key={item.stage} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm ${
                                  item.completed 
                                    ? "border-purple-500/40 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]" 
                                    : "border-white/10 bg-white/5 text-white/30"
                                }`}>
                                  <TimelineIcon icon={item.icon} completed={item.completed} />
                                </div>
                                {!isLast && (
                                  <div className={`w-0.5 flex-1 my-1.5 ${
                                    item.completed ? "bg-purple-500/30" : "bg-white/10"
                                  }`} />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className={`text-sm font-bold ${
                                  item.completed ? "text-white" : "text-white/40"
                                }`}>
                                  {item.label}
                                </p>
                                {item.timestamp ? (
                                  <p className="text-xs text-white/60 mt-0.5 font-mono">
                                    {new Date(item.timestamp).toLocaleString()} ({timeSince(item.timestamp)})
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-white/30 italic mt-0.5">Pendiente</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-between items-center bg-black/40">
              <div>
                {!["completed", "cancelled"].includes(selectedRequest.status) ? (
                  <button
                    disabled={cancellingId === selectedRequest.id}
                    onClick={() => handleCancelRequest(selectedRequest.id)}
                    className="rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    {cancellingId === selectedRequest.id ? "Cancelando..." : "Cancelar Trabajo (Admin)"}
                  </button>
                ) : (
                  <span className="text-xs text-white/40">Este trabajo está cerrado</span>
                )}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/15 transition-all"
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
