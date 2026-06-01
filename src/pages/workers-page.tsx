import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { toast } from "sonner";
import {
  RotateCw,
  Search,
  Calendar,
  X,
  DollarSign,
  Briefcase,
  UserCheck,
  Image as ImageIcon,
  User,
  Star,
  MessageSquare,
  MapPin,
  Navigation,
} from "lucide-react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  fetchUsers,
  fetchWorkerVerificationInbox,
  reviewWorkerVerification,
  updateUser,
  deleteUser,
  fetchWorkerHistory,
  fetchWorkerReviews,
} from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";

const statusLabel: Record<string, string> = {
  searching: "Buscando",
  negotiating: "Negociando",
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
  pending: "Pendiente",
};

function verificationBadge(status?: string) {
  if (status === "verified") {
    return <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300 border border-sky-500/20">Check azul - Verificado</span>;
  }
  if (status === "pending") {
    return <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200 border border-amber-500/20">Pendiente</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs text-on-surface-variant">No verificado</span>;
}

function photoDecisionBadge(value?: boolean | null) {
  if (value === true) return <span className="rounded-full bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300 font-medium">Aprobada</span>;
  if (value === false) return <span className="rounded-full bg-rose-500/20 border border-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300 font-medium">Rechazada</span>;
  return <span className="rounded-full bg-amber-500/20 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-300 font-medium">Pendiente</span>;
}

export default function WorkersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [inbox, setInbox] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // --- Estados de Zoom y Rotación ---
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string; key?: string } | null>(null);

  // --- Estados de Detalle y Trabajos ---
  const [selectedWorker, setSelectedWorker] = useState<AdminUser | null>(null);
  const [jobsModalWorker, setJobsModalWorker] = useState<AdminUser | null>(null);
  const [workerJobs, setWorkerJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [workerReviews, setWorkerReviews] = useState<any[]>([]);

  // --- Estados para Mapa de Trabajos ---
  const [mapModalWorker, setMapModalWorker] = useState<AdminUser | null>(null);
  const [mapJobs, setMapJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [mapViewport, setMapViewport] = useState({
    latitude: -17.7833,
    longitude: -63.1833,
    zoom: 12,
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsModalWorker, setReviewsModalWorker] = useState<AdminUser | null>(null);
  const [jobSearch, setJobSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Estado de búsqueda general ---
  const [workerSearch, setWorkerSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [users, pendingInbox] = await Promise.all([
          fetchUsers(),
          fetchWorkerVerificationInbox(),
        ]);
        if (!mounted) return;
        setItems(users.filter((u) => u.type === "worker"));
        setInbox(pendingInbox);
      } catch {
        if (!mounted) return;
        setItems([]);
        setInbox([]);
        toast.error("Error al conectar con el servidor del backend");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const syncUpdatedWorker = (updated: AdminUser) => {
    setItems((prev) => prev.map((worker) => (worker.id === updated.id ? updated : worker)));
    setInbox((prev) => {
      const withoutCurrent = prev.filter((worker) => worker.id !== updated.id);
      if (updated.verificationStatus === "pending" && (updated.idPhotoUrl || updated.facePhotoUrl)) {
        return [updated, ...withoutCurrent];
      }
      return withoutCurrent;
    });
    // Sincronizar también si está abierto el modal de detalles
    if (selectedWorker && selectedWorker.id === updated.id) {
      setSelectedWorker(updated);
    }
  };

  const [editWorker, setEditWorker] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });

  const openEdit = (row: AdminUser) => {
    setEditWorker(row);
    setEditForm({ firstName: row.firstName, lastName: row.lastName ?? "", phone: row.phone ?? "" });
  };

  const onEdit = async () => {
    if (!editWorker) return;
    try {
      const updated = await updateUser(editWorker.id, editForm);
      syncUpdatedWorker(updated);
      setEditWorker(null);
      toast.success("Trabajador actualizado");
    } catch {
      toast.error("No se pudo actualizar en backend");
    }
  };

  const onDelete = async (row: AdminUser) => {
    if (!confirm('Desactivar trabajador ' + row.firstName + '?')) return;
    try {
      await deleteUser(row.id);
      setItems((prev) => prev.filter((p) => p.id !== row.id));
      toast.success("Trabajador desactivado");
    } catch {
      toast.error("No se pudo desactivar en backend");
    }
  };

  const onToggleBlock = async (row: AdminUser) => {
    if (!confirm(`¿${row.isBlocked ? 'Desbloquear' : 'Bloquear'} al trabajador ${row.firstName}?`)) return;
    try {
      const updated = await updateUser(row.id, { isBlocked: !row.isBlocked });
      syncUpdatedWorker(updated);
      toast.success(`Trabajador ${updated.isBlocked ? 'bloqueado' : 'desbloqueado'}`);
    } catch {
      toast.error(`No se pudo ${row.isBlocked ? 'desbloquear' : 'bloquear'} en backend`);
    }
  };

  const onReviewPhoto = async (
    worker: AdminUser,
    photoType: "id" | "face",
    approved: boolean,
  ) => {
    const action = approved ? "aprobar" : "rechazar";
    const key = `${worker.id}:${photoType}:${action}`;
    setReviewingKey(key);
    try {
      const updated = await reviewWorkerVerification(
        worker.id,
        photoType === "id" ? { idPhotoApproved: approved } : { facePhotoApproved: approved },
      );
      syncUpdatedWorker(updated);
      toast.success(`Foto ${photoType === "id" ? "de carnet" : "de rostro"} ${approved ? "aprobada" : "rechazada"}`);
    } catch {
      toast.error("No se pudo guardar la revision");
    } finally {
      setReviewingKey(null);
    }
  };

  // --- Rotación de Imagen ---
  const handleRotate = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRotations((prev) => ({
      ...prev,
      [key]: ((prev[key] ?? 0) + 90) % 360,
    }));
  };

  // --- Abrir Detalle del Trabajador ---
  const handleOpenWorkerDetail = async (worker: AdminUser) => {
    setSelectedWorker(worker);
    setLoadingJobs(true);
    setLoadingReviews(true);
    try {
      const [jobs, reviews] = await Promise.all([
        fetchWorkerHistory(worker.id),
        fetchWorkerReviews(worker.id)
      ]);
      setWorkerJobs(jobs);
      setWorkerReviews(reviews);
    } catch (err) {
      console.error("Error al obtener datos del trabajador", err);
      setWorkerJobs([]);
      setWorkerReviews([]);
    } finally {
      setLoadingJobs(false);
      setLoadingReviews(false);
    }
  };

  // --- Abrir Mapa de Trabajos ---
  const openMapModal = async (worker: AdminUser) => {
    setMapModalWorker(worker);
    try {
      const jobs = await fetchWorkerHistory(worker.id);
      // Filter only completed jobs with location
      const jobsWithLocation = jobs.filter(
        (job: any) =>
          job.status === 'completed' && job.latitude && job.longitude
      );
      setMapJobs(jobsWithLocation);

      // Center map on first job if available
      if (jobsWithLocation.length > 0) {
        setMapViewport({
          latitude: jobsWithLocation[0].latitude,
          longitude: jobsWithLocation[0].longitude,
          zoom: 13,
        });
      }
    } catch (err) {
      console.error("Error cargando trabajos para mapa:", err);
      setMapJobs([]);
    }
  };

  // --- Desactivar Trabajador desde Ficha ---
  const handleDeactivateWorker = async (worker: AdminUser) => {
    if (!confirm(`¿Está seguro que desea desactivar al trabajador ${worker.firstName} ${worker.lastName ?? ""}?`)) return;
    try {
      await deleteUser(worker.id);
      setItems((prev) => prev.filter((p) => p.id !== worker.id));
      setSelectedWorker(null);
      toast.success("Trabajador desactivado");
    } catch {
      toast.error("No se pudo desactivar en backend");
    }
  };

  const filteredItems = items.filter((w) => {
    if (!workerSearch.trim()) return true;
    const search = workerSearch.toLowerCase().trim();
    return (
      `${w.firstName} ${w.lastName ?? ""}`.toLowerCase().includes(search) ||
      w.email.toLowerCase().includes(search) ||
      w.phone?.includes(search) ||
      w.id.toLowerCase().includes(search)
    );
  });

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "name",
      header: "Worker",
      cell: ({ row }) => {
        const w = row.original;
        const avatar = w.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80";
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt={w.firstName}
              className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
            />
            <button
              onClick={() => handleOpenWorkerDetail(w)}
              className="text-left font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-all"
            >
              {w.firstName} {w.lastName ?? ""}
            </button>
          </div>
        );
      },
    },
    { accessorKey: "email", header: "Email" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (row.original.isAvailable ? "Available" : "Inactive"),
    },
    {
      id: "verified",
      header: "Verificado",
      cell: ({ row }) => verificationBadge(row.original.verificationStatus),
    },
    {
      id: "jobs",
      header: "Total Jobs",
      cell: ({ row }) => row.original.completedJobs ?? 0,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenWorkerDetail(row.original)}
            className="rounded bg-sky-500/20 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/30 transition-colors"
          >
            Ficha
          </button>
          <button
            onClick={() => openMapModal(row.original)}
            className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            title="Ver mapa de trabajos completados"
          >
            <MapPin className="h-3 w-3 inline mr-1" />
            Mapa
          </button>
          <button
            onClick={() => openEdit(row.original)}
            className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onToggleBlock(row.original)}
            className={`rounded px-2 py-1 text-xs transition-colors ${row.original.isBlocked ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30' : 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'}`}
          >
            {row.original.isBlocked ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30 transition-colors"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workers Directory</h2>
          <p className="mt-1 text-on-surface-variant">
            Vista separada de trabajadores. Clientes se administran en su seccion propia.
          </p>
        </div>
        <Modal>
          <ModalTrigger asChild>
            <Button className="border border-white/10 bg-gradient-to-r from-primary-container to-purple-700 text-white">
              Add Worker
            </Button>
          </ModalTrigger>
          <ModalContent>
            <h3 className="text-lg font-semibold">Create Worker</h3>
          </ModalContent>
        </Modal>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-white/5 p-4 relative">
          <input
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2"
            placeholder="Search by name, ID, or specialty..."
          />
        </div>
        {loading ? (
          <div className="p-6 text-sm text-on-surface-variant">Cargando...</div>
        ) : (
          <DataTable data={filteredItems} columns={columns} />
        )}
      </div>

      <div className="glass-panel rounded-xl p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Buzon de Verificacion</h3>
            <p className="text-sm text-on-surface-variant">
              Revisa carnet y foto de rostro por separado. Puedes aprobar una y rechazar la otra.
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-on-surface-variant">
            Pendientes: {inbox.length}
          </span>
        </div>

        {inbox.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-on-surface-variant">
            No hay workers pendientes de revision en este momento.
          </div>
        ) : (
          <div className="grid gap-4">
            {inbox.map((worker) => {
              const workerName = `${worker.firstName} ${worker.lastName ?? ""}`.trim();
              const idPhotoKey = `${worker.id}-id`;
              const facePhotoKey = `${worker.id}-face`;

              return (
                <article key={worker.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-base font-semibold">{workerName}</p>
                      <p className="text-xs text-on-surface-variant">{worker.email}</p>
                    </div>
                    {verificationBadge(worker.verificationStatus)}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">Carnet</p>
                        {worker.idPhotoUrl && !imageErrors[idPhotoKey] && (
                          <button
                            onClick={(e) => handleRotate(idPhotoKey, e)}
                            className="rounded bg-white/5 hover:bg-white/15 p-1 border border-white/10 text-white transition-all flex items-center gap-1 text-[10px]"
                            title="Rotar 90°"
                          >
                            <RotateCw className="h-3 w-3" /> Rotar
                          </button>
                        )}
                      </div>
                      <div 
                        onClick={() => {
                          if (worker.idPhotoUrl && !imageErrors[idPhotoKey]) {
                            setExpandedImage({
                              url: worker.idPhotoUrl,
                              alt: `Carnet de ${workerName}`,
                              key: idPhotoKey
                            });
                          }
                        }}
                        className={`mb-3 h-48 overflow-hidden rounded-md bg-black/30 border border-white/5 relative flex items-center justify-center ${worker.idPhotoUrl && !imageErrors[idPhotoKey] ? 'cursor-zoom-in' : ''}`}
                      >
                        {worker.idPhotoUrl && !imageErrors[idPhotoKey] ? (
                          <img
                            src={worker.idPhotoUrl}
                            alt={`Carnet de ${workerName}`}
                            className="h-full w-full object-contain transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${rotations[idPhotoKey] ?? 0}deg)` }}
                            onError={() => setImageErrors((prev) => ({ ...prev, [idPhotoKey]: true }))}
                          />
                        ) : worker.idPhotoUrl ? (
                          <div className="flex h-full flex-col items-center justify-center p-3 text-center text-xs text-rose-300 bg-rose-950/20">
                            <span>⚠️ Error de carga (Cloudinary)</span>
                            <span className="text-[10px] text-on-surface-variant mt-1 break-all">Enlace roto o expirado</span>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-on-surface-variant">Sin foto de carnet</div>
                        )}
                      </div>
                      <div className="mb-2">{photoDecisionBadge(worker.idPhotoVerified)}</div>
                      <div className="flex gap-2">
                        <button
                          disabled={!worker.idPhotoUrl || reviewingKey !== null || imageErrors[idPhotoKey]}
                          onClick={() => onReviewPhoto(worker, "id", true)}
                          className="rounded bg-sky-500/25 px-3 py-1 text-xs text-sky-200 disabled:opacity-50 hover:bg-sky-500/40 transition-colors"
                        >
                          Aprobar
                        </button>
                        <button
                          disabled={!worker.idPhotoUrl || reviewingKey !== null || imageErrors[idPhotoKey]}
                          onClick={() => onReviewPhoto(worker, "id", false)}
                          className="rounded bg-rose-500/25 px-3 py-1 text-xs text-rose-200 disabled:opacity-50 hover:bg-rose-500/40 transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">Rostro</p>
                        {worker.facePhotoUrl && !imageErrors[facePhotoKey] && (
                          <button
                            onClick={(e) => handleRotate(facePhotoKey, e)}
                            className="rounded bg-white/5 hover:bg-white/15 p-1 border border-white/10 text-white transition-all flex items-center gap-1 text-[10px]"
                            title="Rotar 90°"
                          >
                            <RotateCw className="h-3 w-3" /> Rotar
                          </button>
                        )}
                      </div>
                      <div 
                        onClick={() => {
                          if (worker.facePhotoUrl && !imageErrors[facePhotoKey]) {
                            setExpandedImage({
                              url: worker.facePhotoUrl,
                              alt: `Rostro de ${workerName}`,
                              key: facePhotoKey
                            });
                          }
                        }}
                        className={`mb-3 h-48 overflow-hidden rounded-md bg-black/30 border border-white/5 relative flex items-center justify-center ${worker.facePhotoUrl && !imageErrors[facePhotoKey] ? 'cursor-zoom-in' : ''}`}
                      >
                        {worker.facePhotoUrl && !imageErrors[facePhotoKey] ? (
                          <img
                            src={worker.facePhotoUrl}
                            alt={`Rostro de ${workerName}`}
                            className="h-full w-full object-contain transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${rotations[facePhotoKey] ?? 0}deg)` }}
                            onError={() => setImageErrors((prev) => ({ ...prev, [facePhotoKey]: true }))}
                          />
                        ) : worker.facePhotoUrl ? (
                          <div className="flex h-full flex-col items-center justify-center p-3 text-center text-xs text-rose-300 bg-rose-950/20">
                            <span>⚠️ Error de carga (Cloudinary)</span>
                            <span className="text-[10px] text-on-surface-variant mt-1 break-all">Enlace roto o expirado</span>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-on-surface-variant">Sin foto de rostro</div>
                        )}
                      </div>
                      <div className="mb-2">{photoDecisionBadge(worker.facePhotoVerified)}</div>
                      <div className="flex gap-2">
                        <button
                          disabled={!worker.facePhotoUrl || reviewingKey !== null || imageErrors[facePhotoKey]}
                          onClick={() => onReviewPhoto(worker, "face", true)}
                          className="rounded bg-sky-500/25 px-3 py-1 text-xs text-sky-200 disabled:opacity-50 hover:bg-sky-500/40 transition-colors"
                        >
                          Aprobar
                        </button>
                        <button
                          disabled={!worker.facePhotoUrl || reviewingKey !== null || imageErrors[facePhotoKey]}
                          onClick={() => onReviewPhoto(worker, "face", false)}
                          className="rounded bg-rose-500/25 px-3 py-1 text-xs text-rose-200 disabled:opacity-50 hover:bg-rose-500/40 transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Lightbox/Ampliación de Imagen ─── */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex gap-4">
            <button
              onClick={() => handleRotate(expandedImage.key || expandedImage.url)}
              className="rounded-full bg-white/10 p-3 text-white hover:bg-white/20 hover:scale-105 transition-all flex items-center justify-center shadow-lg"
              title="Rotar 90°"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setExpandedImage(null)}
              className="rounded-full bg-white/10 p-3 text-white hover:bg-rose-500 transition-all flex items-center justify-center shadow-lg"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden">
            <img
              src={expandedImage.url}
              alt={expandedImage.alt}
              className="max-w-full max-h-[80vh] object-contain transition-all duration-300 ease-in-out shadow-2xl rounded-lg"
              style={{ transform: `rotate(${rotations[expandedImage.key || expandedImage.url] ?? 0}deg)` }}
            />
          </div>
          <p className="mt-5 text-sm text-gray-400 font-medium tracking-wide bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{expandedImage.alt}</p>
        </div>
      )}

      {/* ─── Modal de Ficha de Detalle del Trabajador ─── */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1117]/95 shadow-2xl backdrop-blur-md overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-gradient-to-r from-purple-950/20 to-black/40">
              <div className="flex items-center gap-4">
                <img
                  src={selectedWorker.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"}
                  alt={selectedWorker.firstName}
                  onClick={() => setExpandedImage({
                    url: selectedWorker.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
                    alt: `Foto de perfil de ${selectedWorker.firstName}`,
                    key: `${selectedWorker.id}-profile-detail`
                  })}
                  className="h-16 w-16 rounded-full object-cover border-2 border-primary/50 shadow-md shadow-primary/10 shrink-0 cursor-zoom-in hover:scale-105 transition-all"
                  title="Ampliar foto de perfil"
                />
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    {selectedWorker.firstName} {selectedWorker.lastName ?? ""}
                    {verificationBadge(selectedWorker.verificationStatus)}
                  </h3>
                  <p className="text-sm text-on-surface-variant/80 mt-0.5">{selectedWorker.email}</p>
                  <p className="text-xs text-on-surface-variant/60">{selectedWorker.phone || "Sin teléfono registrado"}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedWorker(null); setWorkerJobs([]); }} 
                className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="glass-panel bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-white">{selectedWorker.completedJobs ?? 0}</p>
                    <p className="text-xs text-on-surface-variant">Trabajos</p>
                  </div>
                </div>
                
                <div className="glass-panel bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight text-white mt-1">
                      Bs {loadingJobs ? "..." : (workerJobs.filter(j => j.requestStatus === 'completed').reduce((sum, j) => sum + j.amount, 0)).toFixed(2)}
                    </p>
                    <p className="text-xs text-on-surface-variant">Dinero Ganado</p>
                  </div>
                </div>
                
                <div className="glass-panel bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-white mt-1.5">
                      {selectedWorker.createdAt ? new Date(selectedWorker.createdAt).toLocaleDateString() : "Desconocido"}
                    </p>
                    <p className="text-xs text-on-surface-variant">Cuenta Creada</p>
                  </div>
                </div>
              </div>

              {/* Action: View completed jobs, map and reviews */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setJobsModalWorker(selectedWorker)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white py-3 font-medium text-sm transition-all hover:shadow-lg hover:shadow-primary/10 border border-white/10 hover:scale-[1.01]"
                >
                  <Briefcase className="h-4 w-4" />
                  Ver Trabajos
                </button>
                <button
                  onClick={() => openMapModal(selectedWorker)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-500/95 hover:to-teal-600/95 text-white py-3 font-medium text-sm transition-all hover:shadow-lg hover:shadow-emerald-500/10 border border-white/10 hover:scale-[1.01]"
                >
                  <MapPin className="h-4 w-4" />
                  Mapa de Trabajos
                </button>
                <button
                  onClick={() => setReviewsModalWorker(selectedWorker)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-500/95 hover:to-orange-600/95 text-white py-3 font-medium text-sm transition-all hover:shadow-lg hover:shadow-amber-500/10 border border-white/10 hover:scale-[1.01]"
                >
                  <Star className="h-4 w-4" />
                  Ver Reseñas
                </button>
              </div>

              {/* Verification Photos */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold tracking-wide uppercase text-on-surface-variant/70">Documentos de Verificación</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Carnet */}
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <p className="mb-2 text-xs font-semibold text-gray-300">Foto de Carnet (ID)</p>
                    <div 
                      onClick={() => {
                        if (selectedWorker.idPhotoUrl) {
                          setExpandedImage({
                            url: selectedWorker.idPhotoUrl,
                            alt: `Carnet de ${selectedWorker.firstName}`,
                            key: `${selectedWorker.id}-id-detail`
                          });
                        }
                      }}
                      className={`relative mb-3 h-40 overflow-hidden rounded-lg bg-black/40 border border-white/5 flex items-center justify-center ${selectedWorker.idPhotoUrl ? 'cursor-zoom-in' : ''}`}
                    >
                      {selectedWorker.idPhotoUrl ? (
                        <img
                          src={selectedWorker.idPhotoUrl}
                          alt="Carnet"
                          className="h-full w-full object-contain transition-transform duration-300 ease-in-out"
                          style={{ transform: `rotate(${rotations[`${selectedWorker.id}-id-detail`] ?? 0}deg)` }}
                        />
                      ) : (
                        <span className="text-xs text-on-surface-variant/40 flex flex-col items-center gap-1">
                          <ImageIcon className="h-5 w-5" />
                          Sin foto de carnet
                        </span>
                      )}
                    </div>
                    {selectedWorker.idPhotoUrl && (
                      <div className="flex items-center justify-between">
                        {photoDecisionBadge(selectedWorker.idPhotoVerified)}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleRotate(`${selectedWorker.id}-id-detail`, e)}
                            className="rounded bg-white/5 p-1.5 text-xs text-white hover:bg-white/10 border border-white/5"
                            title="Rotar 90°"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandedImage({
                              url: selectedWorker.idPhotoUrl!,
                              alt: `Carnet de ${selectedWorker.firstName}`,
                              key: `${selectedWorker.id}-id-detail`
                            })}
                            className="rounded bg-primary/20 p-1.5 text-xs text-primary hover:bg-primary/30 border border-primary/10"
                            title="Ampliar"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rostro */}
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <p className="mb-2 text-xs font-semibold text-gray-300">Foto de Rostro (Selfie)</p>
                    <div 
                      onClick={() => {
                        if (selectedWorker.facePhotoUrl) {
                          setExpandedImage({
                            url: selectedWorker.facePhotoUrl,
                            alt: `Rostro de ${selectedWorker.firstName}`,
                            key: `${selectedWorker.id}-face-detail`
                          });
                        }
                      }}
                      className={`relative mb-3 h-40 overflow-hidden rounded-lg bg-black/40 border border-white/5 flex items-center justify-center ${selectedWorker.facePhotoUrl ? 'cursor-zoom-in' : ''}`}
                    >
                      {selectedWorker.facePhotoUrl ? (
                        <img
                          src={selectedWorker.facePhotoUrl}
                          alt="Rostro"
                          className="h-full w-full object-contain transition-transform duration-300 ease-in-out"
                          style={{ transform: `rotate(${rotations[`${selectedWorker.id}-face-detail`] ?? 0}deg)` }}
                        />
                      ) : (
                        <span className="text-xs text-on-surface-variant/40 flex flex-col items-center gap-1">
                          <ImageIcon className="h-5 w-5" />
                          Sin foto de rostro
                        </span>
                      )}
                    </div>
                    {selectedWorker.facePhotoUrl && (
                      <div className="flex items-center justify-between">
                        {photoDecisionBadge(selectedWorker.facePhotoVerified)}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleRotate(`${selectedWorker.id}-face-detail`, e)}
                            className="rounded bg-white/5 p-1.5 text-xs text-white hover:bg-white/10 border border-white/5"
                            title="Rotar 90°"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandedImage({
                              url: selectedWorker.facePhotoUrl!,
                              alt: `Rostro de ${selectedWorker.firstName}`,
                              key: `${selectedWorker.id}-face-detail`
                            })}
                            className="rounded bg-primary/20 p-1.5 text-xs text-primary hover:bg-primary/30 border border-primary/10"
                            title="Ampliar"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-between items-center bg-black/20">
              <div>
                {selectedWorker.isAvailable !== false ? (
                  <button
                    onClick={() => handleDeactivateWorker(selectedWorker)}
                    className="rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/20 px-5 py-2 text-sm font-semibold text-rose-300 transition-all hover:scale-[1.02]"
                  >
                    Desactivar Trabajador
                  </button>
                ) : (
                  <span className="text-xs text-on-surface-variant/40">Trabajador Inactivo</span>
                )}
              </div>
              <button
                onClick={() => { setSelectedWorker(null); setWorkerJobs([]); }}
                className="rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-all"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Trabajos Realizados ─── */}
      {jobsModalWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d1117]/95 shadow-2xl backdrop-blur-md overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-purple-950/20 to-black/40">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Historial de Trabajos
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Trabajos realizados por {jobsModalWorker.firstName} {jobsModalWorker.lastName ?? ""}</p>
              </div>
              <button 
                onClick={() => { setJobsModalWorker(null); setJobSearch(""); setStartDate(""); setEndDate(""); }} 
                className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="border-b border-white/5 bg-white/[0.02] p-4 flex flex-col sm:flex-row gap-3 items-center">
              {/* Search Box */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Buscar por cliente o título de orden..."
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-white placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition-all"
                />
              </div>

              {/* Date Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <div className="flex items-center gap-1.5 bg-black/35 rounded-xl border border-white/15 px-3 py-1.5">
                  <label className="text-[9px] text-on-surface-variant/80 uppercase font-semibold">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none text-xs text-white outline-none focus:ring-0 w-28 [color-scheme:dark]"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 bg-black/35 rounded-xl border border-white/15 px-3 py-1.5">
                  <label className="text-[9px] text-on-surface-variant/80 uppercase font-semibold">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none text-xs text-white outline-none focus:ring-0 w-28 [color-scheme:dark]"
                  />
                </div>

                {(jobSearch || startDate || endDate) && (
                  <button
                    onClick={() => { setJobSearch(""); setStartDate(""); setEndDate(""); }}
                    className="text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 px-3 py-2 rounded-xl transition-all border border-rose-500/20 font-medium"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Content Table / List */}
            <div className="flex-1 overflow-auto p-6">
              {loadingJobs ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-on-surface-variant/60 gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Cargando historial de trabajos...
                </div>
              ) : ( () => {
                const filtered = workerJobs.filter((job) => {
                  const clientName = `${job.client?.firstName ?? ''} ${job.client?.lastName ?? ''}`.toLowerCase();
                  const matchesSearch = jobSearch.trim() === "" ||
                    clientName.includes(jobSearch.toLowerCase()) ||
                    job.title.toLowerCase().includes(jobSearch.toLowerCase());
                    
                  if (!matchesSearch) return false;
                  
                  if (startDate) {
                    const start = new Date(startDate);
                    const jobDate = new Date(job.acceptedAt || job.createdAt);
                    start.setHours(0,0,0,0);
                    jobDate.setHours(0,0,0,0);
                    if (jobDate < start) return false;
                  }
                  
                  if (endDate) {
                    const end = new Date(endDate);
                    const jobDate = new Date(job.acceptedAt || job.createdAt);
                    end.setHours(23,59,59,999);
                    if (jobDate > end) return false;
                  }
                  
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-black/10">
                      <p className="text-sm text-on-surface-variant/60">No se encontraron trabajos con los filtros seleccionados.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-on-surface-variant/80 border-b border-white/10">
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Detalles Trabajo</th>
                          <th className="px-4 py-3 text-center">Fecha</th>
                          <th className="px-4 py-3 text-right">Monto</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {filtered.map((job) => (
                          <tr key={job.requestId || job.offerId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={job.client?.profilePhotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"}
                                  alt={job.client?.firstName}
                                  className="h-7 w-7 rounded-full object-cover border border-white/10 shrink-0"
                                />
                                <div>
                                  <p className="font-semibold text-xs text-white">{job.client?.firstName} {job.client?.lastName ?? ""}</p>
                                  <p className="text-[9px] text-on-surface-variant/50">ID: {job.client?.id.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-xs text-white truncate max-w-[200px]" title={job.title}>{job.title}</p>
                              <p className="text-[10px] text-on-surface-variant/50 max-w-[200px] truncate" title={job.description}>{job.description}</p>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-300">
                              {job.acceptedAt ? new Date(job.acceptedAt).toLocaleDateString() : "S/F"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-400 text-xs">
                              Bs {job.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(() => {
                                const isCompleted = job.requestStatus === "completed";
                                const isCancelled = job.requestStatus === "cancelled";
                                return (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${isCompleted ? 'bg-green-500/10 text-green-300 border border-green-500/20' : isCancelled ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                                    {statusLabel[job.requestStatus] ?? job.requestStatus}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })() }
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-end bg-black/20">
              <button
                onClick={() => { setJobsModalWorker(null); setJobSearch(""); setStartDate(""); setEndDate(""); }}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all"
              >
                Volver a la Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: RESEÑAS DE CLIENTES --- */}
      {reviewsModalWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Reseñas de Clientes</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Calificaciones recibidas por {reviewsModalWorker.firstName} {reviewsModalWorker.lastName ?? ""}</p>
                </div>
              </div>
              <button 
                onClick={() => setReviewsModalWorker(null)} 
                className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0c10]">
              {loadingReviews ? (
                <div className="flex h-40 items-center justify-center flex-col gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent"></div>
                  <p className="text-sm text-on-surface-variant">Cargando reseñas...</p>
                </div>
              ) : workerReviews.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5">
                  <Star className="h-8 w-8 text-white/20 mb-3" />
                  <p className="text-sm font-medium text-white/60">Aún no hay reseñas</p>
                  <p className="text-xs text-white/40 text-center max-w-xs mt-1">Este trabajador todavía no ha recibido calificaciones de sus clientes.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workerReviews.map((review, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-md">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span className="text-xs font-bold">{review.stars}</span>
                          </div>
                          <span className="text-xs text-on-surface-variant/60">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                      
                      {review.comment ? (
                        <p className="text-sm text-gray-300 italic">"{review.comment}"</p>
                      ) : (
                        <p className="text-sm text-on-surface-variant/40 italic">Sin comentario</p>
                      )}
                      
                      <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                          {(review.client_name || "C")[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium truncate">
                          {review.client_name || "Cliente anónimo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-end bg-black/20">
              <button
                onClick={() => setReviewsModalWorker(null)}
                className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {editWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] p-6">
            <h3 className="mb-4 text-lg font-bold">Editar Trabajador</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Nombre</label>
                <input value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Apellido</label>
                <input value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Teléfono</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditWorker(null)} className="rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-white/10">Cancelar</button>
              <button onClick={onEdit} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/80">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: MAPA DE TRABAJOS COMPLETADOS ─── */}
      {mapModalWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Mapa de Trabajos</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Ubicación de trabajos completados por {mapModalWorker.firstName} {mapModalWorker.lastName ?? ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant bg-white/10 px-3 py-1 rounded-full">
                  {mapJobs.length} trabajos en el mapa
                </span>
                <button
                  onClick={() => { setMapModalWorker(null); setSelectedJob(null); }}
                  className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Map Content */}
            <div className="flex-1 relative" style={{ height: "60vh", minHeight: "400px" }}>
              {mapJobs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8">
                  <MapPin className="h-12 w-12 text-white/20 mb-4" />
                  <p className="text-white/60 font-medium">No hay trabajos completados con ubicación</p>
                  <p className="text-white/40 text-sm mt-1 text-center max-w-sm">
                    Este trabajador aún no tiene trabajos completados registrados con coordenadas.
                  </p>
                </div>
              ) : (
                <Map
                  mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN || ""}
                  initialViewState={mapViewport}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  onMove={(evt) => setMapViewport(evt.viewState)}
                >
                  {mapJobs.map((job, index) => (
                    <Marker
                      key={job.id || index}
                      longitude={job.longitude}
                      latitude={job.latitude}
                      anchor="bottom"
                      onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        setSelectedJob(job);
                      }}
                    >
                      <div className="cursor-pointer hover:scale-110 transition-transform">
                        <div className="flex flex-col items-center">
                          <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                            Bs {job.budget || 0}
                          </div>
                          <div className="w-0.5 h-3 bg-emerald-500"></div>
                          <div className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg"></div>
                        </div>
                      </div>
                    </Marker>
                  ))}

                  {selectedJob && (
                    <Popup
                      longitude={selectedJob.longitude}
                      latitude={selectedJob.latitude}
                      anchor="top"
                      onClose={() => setSelectedJob(null)}
                      closeButton={true}
                      closeOnClick={false}
                      className="worker-job-popup"
                    >
                      <div className="p-3 min-w-[200px]">
                        <h4 className="font-semibold text-sm mb-1">{selectedJob.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{selectedJob.category}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Completado</span>
                          <span className="font-medium">Bs {selectedJob.budget}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{selectedJob.address}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(selectedJob.completedAt || selectedJob.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </Popup>
                  )}
                </Map>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 flex justify-between items-center bg-black/20">
              <p className="text-xs text-on-surface-variant">
                <Navigation className="h-3 w-3 inline mr-1" />
                Click en un marcador para ver detalles del trabajo
              </p>
              <button
                onClick={() => { setMapModalWorker(null); setSelectedJob(null); }}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
