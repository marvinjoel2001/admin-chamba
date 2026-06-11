import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { fetchUsers, updateUser, deleteUser } from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";
import { toast } from "sonner";
import { UserReportsModal } from "@/components/user-reports-modal";
import { Flag, X, Calendar } from "lucide-react";

export default function ClientsPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [editClient, setEditClient] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [reportsModalClient, setReportsModalClient] = useState<AdminUser | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await fetchUsers();
        if (!mounted) return;
        setItems(users.filter((u) => u.type === "client"));
      } catch {
        if (!mounted) return;
        setItems([]);
        toast.error("Error al conectar con el servidor del backend");
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openEdit = (row: AdminUser) => {
    setEditClient(row);
    setEditForm({ firstName: row.firstName, lastName: row.lastName ?? "", phone: row.phone ?? "" });
  };

  const onEdit = async () => {
    if (!editClient) return;
    try {
      const updated = await updateUser(editClient.id, editForm);
      setItems((prev) => prev.map((p) => (p.id === editClient.id ? updated : p)));
      setEditClient(null);
      toast.success("Cliente actualizado");
    } catch {
      toast.error("No se pudo actualizar en backend");
    }
  };

  const onDelete = async (row: AdminUser) => {
    if (!confirm(`Desactivar cliente ${row.firstName}?`)) return;
    try {
      await deleteUser(row.id);
      setItems((prev) => prev.filter((p) => p.id !== row.id));
      toast.success("Cliente desactivado");
    } catch {
      toast.error("No se pudo desactivar en backend");
    }
  };

  const onToggleBlock = async (row: AdminUser) => {
    if (!confirm(`¿${row.isBlocked ? 'Desbloquear' : 'Bloquear'} al cliente ${row.firstName}?`)) return;
    try {
      const updated = await updateUser(row.id, { isBlocked: !row.isBlocked });
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      toast.success(`Cliente ${updated.isBlocked ? 'bloqueado' : 'desbloqueado'}`);
    } catch {
      toast.error(`No se pudo ${row.isBlocked ? 'desbloquear' : 'bloquear'} en backend`);
    }
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(() => [
    { 
      id: "name", 
      header: "Cliente", 
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
              onClick={() => setSelectedClient(w)}
              className="text-left font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-all"
            >
              {w.firstName} {w.lastName ?? ""}
            </button>
          </div>
        );
      }
    },
    { accessorKey: "email", header: "Email" },
    { id: "status", header: "Estado", cell: ({ row }) => (row.original.isBlocked ? "Bloqueado" : row.original.isAvailable ? "Activo" : "Inactivo") },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => setSelectedClient(row.original)} className="rounded bg-sky-500/20 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/30">Ficha</button>
          <button onClick={() => openEdit(row.original)} className="rounded bg-white/10 px-2 py-1 text-xs">Editar</button>
          <button onClick={() => onToggleBlock(row.original)} className={`rounded px-2 py-1 text-xs ${row.original.isBlocked ? 'bg-green-500/20 text-green-200' : 'bg-orange-500/20 text-orange-200'}`}>
            {row.original.isBlocked ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button onClick={() => onDelete(row.original)} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">Eliminar</button>
        </div>
      ),
    },
  ], []);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Directorio de Clientes</h2>
          <p className="mt-2 text-on-surface-variant">Administra las cuentas de clientes.</p>
        </div>
      </div>
      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-white/5 p-4">
          <input className="glass-input w-full rounded-lg px-4 py-2" placeholder="Buscar clientes..." />
        </div>
        <DataTable data={items} columns={columns} />
      </div>

      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] p-6">
            <h3 className="mb-4 text-lg font-bold">Editar Cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Nombre</label>
                <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Apellido</label>
                <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Teléfono</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditClient(null)} className="rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-white/10">Cancelar</button>
              <button onClick={onEdit} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/80">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d1117]/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-gradient-to-r from-blue-950/20 to-black/40">
              <div className="flex items-center gap-4">
                <img
                  src={selectedClient.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"}
                  alt={selectedClient.firstName}
                  className="h-16 w-16 rounded-full object-cover border-2 border-primary/50 shadow-md shadow-primary/10 shrink-0"
                />
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    {selectedClient.firstName} {selectedClient.lastName ?? ""}
                  </h3>
                  <p className="text-sm text-on-surface-variant/80 mt-0.5">{selectedClient.email}</p>
                  <p className="text-xs text-on-surface-variant/60">{selectedClient.phone || "Sin teléfono registrado"}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)} 
                className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-panel bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-white mt-1.5">
                      {selectedClient.createdAt ? new Date(selectedClient.createdAt).toLocaleDateString() : "Desconocido"}
                    </p>
                    <p className="text-xs text-on-surface-variant">Cuenta Creada</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setReportsModalClient(selectedClient)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-500/95 hover:to-red-600/95 text-white py-3 font-medium text-sm transition-all hover:shadow-lg hover:shadow-rose-500/10 border border-white/10 hover:scale-[1.01]"
                >
                  <Flag className="h-4 w-4" />
                  Ver Reportes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {reportsModalClient && (
        <UserReportsModal
          user={reportsModalClient}
          onClose={() => setReportsModalClient(null)}
        />
      )}
    </section>
  );
}
