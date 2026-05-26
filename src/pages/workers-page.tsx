import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { toast } from "sonner";
import {
  fetchUsers,
  fetchWorkerVerificationInbox,
  reviewWorkerVerification,
  updateUser,
} from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";

function verificationBadge(status?: string) {
  if (status === "verified") {
    return <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2 py-1 text-xs text-sky-300">Check azul - Verificado</span>;
  }
  if (status === "pending") {
    return <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Pendiente</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-xs text-on-surface-variant">No verificado</span>;
}

function photoDecisionBadge(value?: boolean | null) {
  if (value === true) return <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Aprobada</span>;
  if (value === false) return <span className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Rechazada</span>;
  return <span className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Pendiente</span>;
}

export default function WorkersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [inbox, setInbox] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
  };

  const onEdit = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, {
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
      });
      syncUpdatedWorker(updated);
      toast.success("Trabajador actualizado");
    } catch {
      toast.error("No se pudo actualizar en backend");
    }
  };

  const onDelete = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, { isAvailable: false });
      syncUpdatedWorker(updated);
      toast.success("Trabajador desactivado");
    } catch {
      setItems((prev) => prev.filter((p) => p.id !== row.id));
      toast.warning("No existe DELETE /users. Se aplico eliminacion local");
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

  const columns: ColumnDef<AdminUser>[] = [
      {
        id: "name",
        header: "Worker",
        cell: ({ row }) => `${row.original.firstName} ${row.original.lastName ?? ""}`.trim(),
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
              onClick={() => onEdit(row.original)}
              className="rounded bg-white/10 px-2 py-1 text-xs"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(row.original)}
              className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200"
            >
              Eliminar
            </button>
          </div>
        ),
      },
    ];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
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
        <div className="border-b border-white/5 p-4">
          <input
            className="glass-input w-full rounded-lg px-4 py-2"
            placeholder="Search by name, ID, or specialty..."
          />
        </div>
        {loading ? (
          <div className="p-6 text-sm text-on-surface-variant">Cargando...</div>
        ) : (
          <DataTable data={items} columns={columns} />
        )}
      </div>

      <div className="glass-panel rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
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
                      <p className="mb-2 text-sm font-medium">Carnet</p>
                      <div className="mb-3 h-48 overflow-hidden rounded-md bg-black/30">
                        {worker.idPhotoUrl && !imageErrors[idPhotoKey] ? (
                          <img
                            src={worker.idPhotoUrl}
                            alt={`Carnet de ${workerName}`}
                            className="h-full w-full object-contain"
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
                          className="rounded bg-sky-500/25 px-3 py-1 text-xs text-sky-200 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          disabled={!worker.idPhotoUrl || reviewingKey !== null || imageErrors[idPhotoKey]}
                          onClick={() => onReviewPhoto(worker, "id", false)}
                          className="rounded bg-rose-500/25 px-3 py-1 text-xs text-rose-200 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 p-3">
                      <p className="mb-2 text-sm font-medium">Rostro</p>
                      <div className="mb-3 h-48 overflow-hidden rounded-md bg-black/30">
                        {worker.facePhotoUrl && !imageErrors[facePhotoKey] ? (
                          <img
                            src={worker.facePhotoUrl}
                            alt={`Rostro de ${workerName}`}
                            className="h-full w-full object-contain"
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
                          className="rounded bg-sky-500/25 px-3 py-1 text-xs text-sky-200 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          disabled={!worker.facePhotoUrl || reviewingKey !== null || imageErrors[facePhotoKey]}
                          onClick={() => onReviewPhoto(worker, "face", false)}
                          className="rounded bg-rose-500/25 px-3 py-1 text-xs text-rose-200 disabled:opacity-50"
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
    </section>
  );
}
