import { requests } from "@/data/mock";
import { DataTable } from "@/components/ui/data-table";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

export default function RequestsPage() {
  const columns = useMemo<ColumnDef<(typeof requests)[number]>[]>(() => [
    { accessorKey: "id", header: "Request ID" },
    { accessorKey: "title", header: "Title" },
    { accessorKey: "worker", header: "Worker" },
    { accessorKey: "client", header: "Client" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "budget", header: "Budget" }
  ], []);

  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="mb-4 text-3xl font-bold">Requests</h2>
      <DataTable data={requests} columns={columns} />
    </section>
  );
}
