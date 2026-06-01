import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { fetchUsers, updateUser, deleteUser } from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";
import { toast } from "sonner";

export default function ClientsPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [editClient, setEditClient] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });

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
    { id: "name", header: "Cliente", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName ?? ""}`.trim() },
    { accessorKey: "email", header: "Email" },
    { id: "status", header: "Estado", cell: ({ row }) => (row.original.isBlocked ? "Bloqueado" : row.original.isAvailable ? "Activo" : "Inactivo") },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
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
    </section>
  );
}
