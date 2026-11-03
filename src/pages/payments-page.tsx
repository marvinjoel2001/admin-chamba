import { useCallback, useEffect, useState } from "react";
import { Ban, Check, RefreshCw, Undo2 } from "lucide-react";
import { declineRefund, fetchPayments, markRefunded, startRefund } from "@/lib/admin-api";
import type { PaymentRecord, PaymentStatus } from "@/lib/types";

const STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Esperando pago", className: "bg-white/10 text-on-surface-variant" },
  reported: { label: "Reportado (antiguo)", className: "bg-white/10 text-on-surface-variant" },
  paid: { label: "Pagado", className: "bg-green-500/20 text-green-400" },
  failed: { label: "Fallido", className: "bg-red-500/20 text-red-400" },
  expired: { label: "Vencido", className: "bg-white/10 text-on-surface-variant" },
  cancelled: { label: "Anulado", className: "bg-white/10 text-on-surface-variant" },
  refund_pending: { label: "Reembolso pendiente", className: "bg-amber-500/20 text-amber-300" },
  refunded: { label: "Reembolsado", className: "bg-sky-500/20 text-sky-300" },
  refund_declined: { label: "Reembolso rechazado", className: "bg-white/10 text-on-surface-variant" },
};

const FILTERS = [
  ["refund_pending", "Reembolsos pendientes"],
  ["", "Todos"],
  ["paid", "Pagados"],
  ["refunded", "Reembolsados"],
  ["refund_declined", "Reembolsos rechazados"],
] as const;

const money = (p: PaymentRecord) =>
  `${p.currency === "BOB" ? "Bs" : p.currency} ${p.amount.toLocaleString("es-BO", {
    minimumFractionDigits: p.amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) : "—";

const REQUEST_STATUS: Record<string, string> = {
  searching: "Buscando",
  negotiating: "Negociando",
  assigned: "En curso",
  in_progress: "En curso",
  completed: "Terminado",
  cancelled: "Cancelado",
};

type Action = "start" | "done" | "decline";

/**
 * Pagos hechos dentro de la app. Solo los confirma la API del proveedor (no
 * hay confirmación manual). Cuando un pago ya no corresponde —el trabajo se
 * canceló o el cliente pagó una oferta que no se aceptó— pasa solo a
 * "Reembolso pendiente": devuelve el dinero y márcalo como reembolsado.
 */
export default function PaymentsPage() {
  const [filter, setFilter] = useState<string>("refund_pending");
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

  const act = async (payment: PaymentRecord, action: Action) => {
    const who = payment.clientName || "el cliente";
    let text: string | null = null;
    if (action === "start") {
      text = prompt(`¿Por qué se devuelven ${money(payment)} a ${who}? (lo verá el registro)`);
      if (text === null) return;
      if (text.trim().length < 3) return alert("Escribe el motivo del reembolso.");
    } else if (action === "done") {
      text = prompt(
        `Confirma que ya devolviste ${money(payment)} a ${who}.\nReferencia de la devolución (opcional, ej. N° de transferencia):`,
        "",
      );
      if (text === null) return;
    } else {
      text = prompt(`¿Por qué NO se devuelven ${money(payment)} a ${who}?`);
      if (text === null) return;
      if (text.trim().length < 3) return alert("Escribe por qué no se reembolsa.");
    }
    setBusyId(payment.id);
    try {
      if (action === "start") await startRefund(payment.id, text.trim());
      else if (action === "done") await markRefunded(payment.id, text.trim() || undefined);
      else await declineRefund(payment.id, text.trim());
      await load();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (e as Error).message;
      alert("No se pudo actualizar el pago: " + message);
    } finally {
      setBusyId(null);
    }
  };

  const emptyText =
    filter === "refund_pending"
      ? "No hay reembolsos pendientes."
      : filter === "refunded"
        ? "Todavía no hay reembolsos hechos."
        : "No hay pagos.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Pagos</h1>
          <p className="text-sm text-on-surface-variant">
            Los pagos los confirma la API del proveedor. Aquí devuelves los que ya no corresponden.
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
        <table className="w-full min-w-[880px] text-left">
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
                  {emptyText}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 text-sm align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.clientName || "—"}</div>
                    <div className="text-xs text-on-surface-variant">{p.clientEmail}</div>
                    {p.clientPhone && (
                      <div className="text-xs text-on-surface-variant">{p.clientPhone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <div className="truncate">{p.requestTitle || "—"}</div>
                    {p.requestStatus && (
                      <div className="text-xs text-on-surface-variant">
                        {REQUEST_STATUS[p.requestStatus] ?? p.requestStatus}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.methodName || p.provider}</td>
                  <td className="px-4 py-3 font-semibold">{money(p)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {when(p.refundRequestedAt || p.confirmedAt || p.createdAt)}
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS[p.status]?.className ?? ""}`}>
                      {STATUS[p.status]?.label ?? p.status}
                    </span>
                    {p.refundReason && (
                      <div className="mt-1 text-xs text-on-surface-variant">Motivo: {p.refundReason}</div>
                    )}
                    {p.refundNote && (
                      <div className="mt-1 text-xs text-on-surface-variant">
                        {p.status === "refund_declined" ? "No se devolvió: " : "Referencia: "}
                        {p.refundNote}
                      </div>
                    )}
                    {p.refundedAt && (
                      <div className="mt-1 text-xs text-on-surface-variant">Devuelto {when(p.refundedAt)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {p.status === "refund_pending" && (
                        <>
                          <button
                            onClick={() => act(p, "done")}
                            disabled={busyId === p.id}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Marcar reembolsado
                          </button>
                          <button
                            onClick={() => act(p, "decline")}
                            disabled={busyId === p.id}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" /> No reembolsar
                          </button>
                        </>
                      )}
                      {p.status === "paid" && (
                        <button
                          onClick={() => act(p, "start")}
                          disabled={busyId === p.id}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Reembolsar
                        </button>
                      )}
                      {!["refund_pending", "paid"].includes(p.status) && (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </div>
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
