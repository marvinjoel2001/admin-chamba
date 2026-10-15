import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { confirmPayment, fetchPayments, rejectPayment } from "@/lib/admin-api";
import type { PaymentRecord } from "@/lib/types";

const STATUS: Record<PaymentRecord["status"], { label: string; className: string }> = {
  reported: { label: "Por confirmar", className: "bg-amber-500/20 text-amber-300" },
  pending: { label: "Esperando pago", className: "bg-white/10 text-on-surface-variant" },
  paid: { label: "Pagado", className: "bg-green-500/20 text-green-400" },
  failed: { label: "Rechazado", className: "bg-red-500/20 text-red-400" },
  expired: { label: "Vencido", className: "bg-white/10 text-on-surface-variant" },
  cancelled: { label: "Anulado", className: "bg-white/10 text-on-surface-variant" },
};

const FILTERS = [
  ["reported", "Por confirmar"],
  ["", "Todos"],
  ["paid", "Pagados"],
  ["failed", "Rechazados"],
] as const;

const money = (p: PaymentRecord) =>
  `${p.currency === "BOB" ? "Bs" : p.currency} ${p.amount.toLocaleString("es-BO", {
    minimumFractionDigits: p.amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) : "—";

/**
 * Pagos hechos dentro de la app. Los de "QR fijo" quedan "Por confirmar"
 * cuando el cliente toca "Ya pagué": revisa tu banco y confírmalos aquí.
 */
export default function PaymentsPage() {
  const [filter, setFilter] = useState<string>("reported");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await fetchPayments(filter || undefined));
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (payment: PaymentRecord, action: "confirm" | "reject") => {
    if (action === "confirm" && !confirm(`¿Confirmas que recibiste ${money(payment)} de ${payment.clientName || "este cliente"}?`)) return;
    const reason =
      action === "reject"
        ? prompt("¿Por qué rechazas este pago? (se guarda en el registro)", "No se recibió el pago")
        : undefined;
    if (action === "reject" && reason === null) return;
    setBusyId(payment.id);
    try {
      if (action === "confirm") await confirmPayment(payment.id);
      else await rejectPayment(payment.id, reason || undefined);
      await load();
    } catch (e) {
      alert("No se pudo actualizar el pago: " + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Pagos</h1>
          <p className="text-sm text-on-surface-variant">
            Pagos hechos en la app. Confirma los de QR después de verlos en tu banco.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value || "all"}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === value ? "bg-primary text-white" : "bg-white/5 text-on-surface-variant hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-white/10 bg-white/5">
            <tr className="text-sm text-on-surface-variant">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Trabajo</th>
              <th className="px-4 py-3 font-semibold">Método</th>
              <th className="px-4 py-3 font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  Cargando...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  {filter === "reported" ? "No hay pagos por confirmar." : "No hay pagos."}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 text-sm">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.clientName || "—"}</div>
                    <div className="text-xs text-on-surface-variant">{p.clientEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{p.requestTitle || "—"}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.methodName || p.provider}</td>
                  <td className="px-4 py-3 font-semibold">{money(p)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {when(p.reportedAt || p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS[p.status]?.className ?? ""}`}>
                      {STATUS[p.status]?.label ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {["reported", "pending"].includes(p.status) && p.provider === "manual_qr" ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => act(p, "confirm")}
                          disabled={busyId === p.id}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => act(p, "reject")}
                          disabled={busyId === p.id}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-on-surface-variant">
                        {p.confirmedAt ? `Confirmado ${when(p.confirmedAt)}` : "—"}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
