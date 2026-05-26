import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { fetchUsers, updateUser } from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";
import { toast } from "sonner";

export default function ClientsPage() {
  const [items, setItems] = useState<AdminUser[]>([]);

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

  const onEdit = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, { firstName: row.firstName, phone: row.phone });
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      toast.success("Cliente actualizado");
    } catch {
      toast.error("No se pudo actualizar en backend");
    }
  };

  const onDelete = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, { verificationStatus: "pending" });
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      toast.success("Cliente marcado para revisión");
    } catch {
      setItems((prev) => prev.filter((p) => p.id !== row.id));
      toast.warning("No existe DELETE /users. Se aplicó eliminación local");
    }
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(() => [
    { id: "name", header: "Client Name", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName ?? ""}`.trim() },
    { accessorKey: "email", header: "Email Contact" },
    { id: "status", header: "Status", cell: ({ row }) => (row.original.isAvailable ? "Active" : "Inactive") },
    { id: "actions", header: "Actions", cell: ({ row }) => <div className="flex gap-2"><button onClick={() => onEdit(row.original)} className="rounded bg-white/10 px-2 py-1 text-xs">Editar</button><button onClick={() => onDelete(row.original)} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">Eliminar</button></div> }
  ], []);

  return (
    <section className="flex flex-col gap-8">
      <div><h2 className="text-3xl font-semibold tracking-tight">Clients Directory</h2><p className="mt-2 text-on-surface-variant">Manage your enterprise client accounts and configurations.</p></div>
      <div className="glass-panel overflow-hidden rounded-xl"><div className="border-b border-white/5 p-4"><input className="glass-input w-full rounded-lg px-4 py-2" placeholder="Search clients..." /></div><DataTable data={items} columns={columns} /></div>
    </section>
  );
}
