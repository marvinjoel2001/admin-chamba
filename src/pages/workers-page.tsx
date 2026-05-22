import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { toast } from "sonner";
import { fetchUsers, updateUser } from "@/lib/admin-api";
import type { AdminUser } from "@/lib/types";
import { workers as workersMock } from "@/data/mock";

export default function WorkersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await fetchUsers();
        if (!mounted) return;
        setItems(users.filter((u) => u.type === "worker"));
      } catch {
        if (!mounted) return;
        setItems(workersMock.map((w, i) => ({ id: `mock-${i}`, type: "worker", email: `${w.name.toLowerCase().replace(/ /g, ".")}@mock.com`, firstName: w.name.split(" ")[0], lastName: w.name.split(" ").slice(1).join(" "), isAvailable: w.status !== "suspended", completedJobs: w.jobs } as AdminUser)));
        toast.warning("Backend no disponible, mostrando datos mock");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onEdit = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, { firstName: row.firstName, lastName: row.lastName, phone: row.phone });
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      toast.success("Trabajador actualizado");
    } catch {
      toast.error("No se pudo actualizar en backend");
    }
  };

  const onDelete = async (row: AdminUser) => {
    try {
      const updated = await updateUser(row.id, { isAvailable: false });
      setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)));
      toast.success("Trabajador desactivado");
    } catch {
      setItems((prev) => prev.filter((p) => p.id !== row.id));
      toast.warning("No existe DELETE /users. Se aplicó eliminación local");
    }
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(() => [
    { id: "name", header: "Worker", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName ?? ""}`.trim() },
    { accessorKey: "email", header: "Email" },
    { id: "status", header: "Status", cell: ({ row }) => (row.original.isAvailable ? "Available" : "Inactive") },
    { id: "jobs", header: "Total Jobs", cell: ({ row }) => row.original.completedJobs ?? 0 },
    { id: "actions", header: "Actions", cell: ({ row }) => <div className="flex gap-2"><button onClick={() => onEdit(row.original)} className="rounded bg-white/10 px-2 py-1 text-xs">Editar</button><button onClick={() => onDelete(row.original)} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">Eliminar</button></div> }
  ], []);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div><h2 className="text-3xl font-bold tracking-tight">Workers Directory</h2><p className="mt-1 text-on-surface-variant">Manage, dispatch, and monitor your field service professionals.</p></div>
        <Modal><ModalTrigger asChild><Button className="border border-white/10 bg-gradient-to-r from-primary-container to-purple-700 text-white">Add Worker</Button></ModalTrigger><ModalContent><h3 className="text-lg font-semibold">Create Worker</h3></ModalContent></Modal>
      </div>
      <div className="glass-panel overflow-hidden rounded-xl"><div className="border-b border-white/5 p-4"><input className="glass-input w-full rounded-lg px-4 py-2" placeholder="Search by name, ID, or specialty..." /></div>{loading ? <div className="p-6 text-sm text-on-surface-variant">Cargando...</div> : <DataTable data={items} columns={columns} />}</div>
    </section>
  );
}
