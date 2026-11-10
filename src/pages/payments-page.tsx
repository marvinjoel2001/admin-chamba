import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Check,
  CheckCheck,
  Copy,
  MessageCircle,
  RefreshCw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  confirmPaymentForRefund,
  declineRefund,
  discardUnpaidPayment,
  fetchPayments,
  markRefunded,
  startRefund,
} from "@/lib/admin-api";
import type { PaymentRecord, PaymentStatus } from "@/lib/types";
import { toast } from "sonner";

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
  ["pending", "Pendientes / Por verificar"],
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

type ModalActionType = "start" | "done" | "decline" | "confirm_refund" | "discard";

interface ModalState {
  payment: PaymentRecord;
  action: ModalActionType;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  required: boolean;
  confirmText: string;
  variant: "success" | "danger" | "warning" | "neutral";
}

/**
 * Pagos hechos dentro de la app. Los pagos son verificados o devueltos desde
 * este panel con control total administrativo para devoluciones, confirmación
 * y descarte de pagos no cobrados.
 */
export default function PaymentsPage() {
  const [filter, setFilter] = useState<string>("refund_pending");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado del modal para reemplazar window.prompt()
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [submittingModal, setSubmittingModal] = useState(false);

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

  const copyRequestId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast.success("ID de solicitud copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar el ID");
    }
  };

  const openActionModal = (payment: PaymentRecord, action: ModalActionType) => {
    const who = payment.clientName || "el cliente";
    const amountStr = money(payment);
    setModalInput("");

    if (action === "start") {
      setActiveModal({
        payment,
        action,
        title: "Iniciar Devolución de Pago",
        description: `Se devolverán ${amountStr} a ${who}. Este motivo quedará registrado en el historial.`,
        fieldLabel: "¿Por qué se devuelve el dinero?",
        placeholder: "Ej: Trabajo cancelado antes de iniciarse, acuerdo con cliente...",
        required: true,
        confirmText: "Iniciar reembolso",
        variant: "warning",
      });
    } else if (action === "done") {
      setActiveModal({
        payment,
        action,
        title: "Confirmar Reembolso Efectuado",
        description: `Confirma que ya transferiste ${amountStr} a ${who} vía QR o transferencia bancaria.`,
        fieldLabel: "Referencia de la transferencia / comprobante (opcional):",
        placeholder: "Ej: Transferencia Banco Unión #892134, QR devuelto...",
        required: false,
        confirmText: "Marcar como reembolsado",
        variant: "success",
      });
    } else if (action === "decline") {
      setActiveModal({
        payment,
        action,
        title: "Rechazar Reembolso",
        description: `Indica el motivo por el cual NO corresponde devolver ${amountStr} a ${who}.`,
        fieldLabel: "Motivo del rechazo:",
        placeholder: "Ej: El trabajador completó el trabajo a satisfacción...",
        required: true,
        confirmText: "Rechazar devolución",
        variant: "danger",
      });
    } else if (action === "confirm_refund") {
      setActiveModal({
        payment,
        action,
        title: "Confirmar Pago y Marcar para Reembolso",
        description: `Úsalo si el cliente sí pagó el QR/transferencia (${amountStr}) antes de que el trabajo se cancelara. Se moverá a 'Reembolso pendiente'.`,
        fieldLabel: "Motivo del reembolso / Referencia del pago del cliente:",
        placeholder: "Ej: Cliente pagó el QR a las 14:10 pero el trabajo fue cancelado...",
        required: true,
        confirmText: "Confirmar y Reembolsar",
        variant: "warning",
      });
    } else if (action === "discard") {
      setActiveModal({
        payment,
        action,
        title: "Descartar Pago No Cobrado",
        description: `Si verificaste en la cuenta bancaria que NO ingresó dinero (${amountStr}), descarta este registro para cerrarlo.`,
        fieldLabel: "Nota administrativa (opcional):",
        placeholder: "Ej: QR no fue pagado en el banco, tiempo de validez expirado...",
        required: false,
        confirmText: "Descartar pago",
        variant: "neutral",
      });
    }
  };

  const handleModalSubmit = async () => {
    if (!activeModal) return;
    const trimmed = modalInput.trim();
    if (activeModal.required && trimmed.length < 3) {
      toast.error("Por favor completa el campo con un motivo válido (mínimo 3 caracteres).");
      return;
    }

    setSubmittingModal(true);
    setBusyId(activeModal.payment.id);
    try {
      if (activeModal.action === "start") {
        await startRefund(activeModal.payment.id, trimmed);
        toast.success("Reembolso iniciado correctamente");
      } else if (activeModal.action === "done") {
        await markRefunded(activeModal.payment.id, trimmed || undefined);
        toast.success("Pago marcado como reembolsado");
      } else if (activeModal.action === "decline") {
        await declineRefund(activeModal.payment.id, trimmed);
        toast.success("Reembolso rechazado");
      } else if (activeModal.action === "confirm_refund") {
        await confirmPaymentForRefund(activeModal.payment.id, trimmed);
        toast.success("Pago confirmado y marcado para reembolso");
      } else if (activeModal.action === "discard") {
        await discardUnpaidPayment(activeModal.payment.id, trimmed || undefined);
        toast.success("Pago no cobrado descartado");
      }
      setActiveModal(null);
      await load();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (e as Error).message;
      toast.error("Error al procesar el pago: " + message);
    } finally {
      setSubmittingModal(false);
      setBusyId(null);
    }
  };

  const emptyText =
    filter === "refund_pending"
      ? "No hay reembolsos pendientes."
      : filter === "pending"
      ? "No hay pagos pendientes por verificar."
      : filter === "refunded"
      ? "Todavía no hay reembolsos hechos."
      : "No hay pagos.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Pagos y Reembolsos</h1>
          <p className="text-sm text-on-surface-variant">
            Supervisa pagos recibidos, confirma pagos para devolución y gestiona reembolsos de solicitudes canceladas.
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
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === value
                ? "bg-primary text-white"
                : "bg-white/5 text-on-surface-variant hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
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
              payments.map((p) => {
                const cleanPhone = p.clientPhone ? p.clientPhone.replace(/\D/g, "") : "";
                return (
                  <tr key={p.id} className="hover:bg-white/5 text-sm align-top">
                    {/* Cliente con enlace a WhatsApp */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.clientName || "—"}</div>
                      <div className="text-xs text-on-surface-variant">{p.clientEmail}</div>
                      {p.clientPhone && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-on-surface-variant font-mono">{p.clientPhone}</span>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar al cliente por WhatsApp para pedirle su QR o cuenta de devolución"
                            className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Trabajo con título, cancelado por, motivo e ID copiable */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="font-medium text-white line-clamp-1">{p.requestTitle || "—"}</div>
                      {p.requestStatus && (
                        <div className="text-xs text-on-surface-variant">
                          {REQUEST_STATUS[p.requestStatus] ?? p.requestStatus}
                        </div>
                      )}
                      {p.requestId && (
                        <div className="mt-1">
                          <button
                            onClick={() => copyRequestId(p.requestId)}
                            title="Copiar ID de la solicitud"
                            className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-sky-400 hover:text-sky-300 hover:bg-white/10 transition-colors"
                          >
                            {copiedId === p.requestId ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-white/50" />
                                <span>ID: {p.requestId.slice(0, 8)}...</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {(p.cancelledByName || p.cancelledByRole || p.cancelReason) && (
                        <div className="mt-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 p-1.5 text-[11px] leading-snug text-rose-300">
                          <div className="font-semibold text-rose-200">
                            Cancelado por:{" "}
                            {p.cancelledByName ||
                              (p.cancelledByRole === "worker"
                                ? "Trabajador"
                                : p.cancelledByRole === "client"
                                ? "Cliente"
                                : p.cancelledByRole === "admin"
                                ? "Administrador"
                                : p.cancelledByRole || "Usuario")}
                          </div>
                          {p.cancelReason && (
                            <div className="mt-0.5 italic text-rose-300/90">
                              "{p.cancelReason}"
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Método con externalId si existe */}
                    <td className="px-4 py-3 text-on-surface-variant">
                      <div className="font-medium text-on-surface">{p.methodName || p.provider}</div>
                      {p.externalId && (
                        <div className="mt-0.5 font-mono text-[11px] text-white/50">
                          Ref: {p.externalId}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-white">{money(p)}</td>

                    <td className="px-4 py-3 text-on-surface-variant">
                      {when(p.refundRequestedAt || p.confirmedAt || p.createdAt)}
                    </td>

                    {/* Estado con notas */}
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

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {p.status === "refund_pending" && (
                          <>
                            <button
                              onClick={() => openActionModal(p, "done")}
                              disabled={busyId === p.id}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Marcar reembolsado
                            </button>
                            <button
                              onClick={() => openActionModal(p, "decline")}
                              disabled={busyId === p.id}
                              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Ban className="w-3.5 h-3.5" /> No reembolsar
                            </button>
                          </>
                        )}
                        {p.status === "paid" && (
                          <button
                            onClick={() => openActionModal(p, "start")}
                            disabled={busyId === p.id}
                            className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Reembolsar
                          </button>
                        )}
                        {(p.status === "pending" || p.status === "reported" || p.status === "expired") && (
                          <>
                            <button
                              onClick={() => openActionModal(p, "confirm_refund")}
                              disabled={busyId === p.id}
                              title="Confirmar que el cliente sí pagó antes de cancelar y marcar para devolución"
                              className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                            >
                              <Undo2 className="w-3.5 h-3.5" /> Confirmar y reembolsar
                            </button>
                            <button
                              onClick={() => openActionModal(p, "discard")}
                              disabled={busyId === p.id}
                              title="Descartar si el dinero nunca ingresó a la cuenta"
                              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Descartar
                            </button>
                          </>
                        )}
                        {!["refund_pending", "paid", "pending", "reported", "expired"].includes(p.status) && (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal interactivo limpio para evitar window.prompt() */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#120f1a] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">{activeModal.title}</h3>
                <p className="text-xs text-white/60 mt-1">{activeModal.description}</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                disabled={submittingModal}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80">
                {activeModal.fieldLabel}
                {activeModal.required && <span className="text-rose-400 ml-1">*</span>}
              </label>
              <textarea
                rows={3}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder={activeModal.placeholder}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={submittingModal}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={submittingModal || (activeModal.required && modalInput.trim().length < 3)}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 ${
                  activeModal.variant === "success"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : activeModal.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : activeModal.variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-white/15 hover:bg-white/25"
                }`}
              >
                {submittingModal ? "Guardando..." : activeModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
