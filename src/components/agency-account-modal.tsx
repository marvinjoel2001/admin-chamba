import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createAgencySettlement, fetchAgencyAccount, type AgencyAccount } from "@/lib/admin-api";

const bs = (n: number) =>
  `Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * Cuenta de la agencia con Chamba. Pagos con QR/tarjeta: Chamba cobró y le
 * debe a la agencia (menos su comisión). Efectivo: la agencia le debe a
 * Chamba la comisión. Aquí se registra cuando se paga una u otra cosa.
 */
export function AgencyAccountModal({
  agencyId,
  agencyName,
  onClose,
}: {
  agencyId: string;
  agencyName: string;
  onClose: () => void;
}) {
  const [account, setAccount] = useState<AgencyAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccount(await fetchAgencyAccount(agencyId));
      setError(null);
    } catch {
      setError("No se pudo cargar la cuenta de la agencia.");
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const balance = account?.summary.balance ?? 0;
  // Si Chamba debe, lo normal es registrar un pago a la agencia, y al revés.
  const direction: "to_agency" | "to_chamba" = balance >= 0 ? "to_agency" : "to_chamba";
  const value = Number(amount.replace(",", "."));

  useEffect(() => {
    if (account) setAmount(balance === 0 ? "" : String(Math.abs(balance)));
  }, [account, balance]);

  const save = async () => {
    if (!(value > 0)) return;
    setSaving(true);
    try {
      setAccount(await createAgencySettlement(agencyId, { direction, amount: value, note: note.trim() || undefined }));
      setNote("");
      toast.success("Liquidación registrada");
    } catch {
      toast.error("No se pudo registrar la liquidación");
    } finally {
      setSaving(false);
    }
  };

  const s = account?.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Cuenta de {agencyName}</h2>
            <p className="text-sm text-on-surface-variant">Pagos entre Chamba y la agencia.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500">{error}</p>}

        {s && (
          <>
            <div
              className={`mb-4 rounded-xl border p-4 ${
                balance > 0
                  ? "border-amber-500/30 bg-amber-500/10"
                  : balance < 0
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-sm font-medium">
                {balance > 0
                  ? "Chamba le debe a la agencia"
                  : balance < 0
                    ? "La agencia le debe a Chamba"
                    : "Están al día"}
              </p>
              <p className="text-3xl font-bold">{bs(balance)}</p>
            </div>

            <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">Cobrado por Chamba (QR/tarjeta)</dt>
                <dd className="font-semibold">
                  {bs(s.digitalCollected)} en {s.digitalJobs} trabajos
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Comisión en esos pagos</dt>
                <dd className="font-semibold">{bs(s.digitalFees)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Comisión por efectivo</dt>
                <dd className="font-semibold">
                  {bs(s.cashFees)} en {s.cashJobs} trabajos
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Ya liquidado</dt>
                <dd className="font-semibold">
                  {bs(s.paidToAgency)} pagado · {bs(s.paidToChamba)} recibido
                </dd>
              </div>
            </dl>

            <div className="mb-5 space-y-3 rounded-xl border border-white/10 p-4">
              <p className="text-sm font-semibold">
                {direction === "to_agency" ? "Registrar pago de Chamba a la agencia" : "Registrar pago de la agencia a Chamba"}
              </p>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-primary"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="Monto en Bs"
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-primary"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota (ej: transferencia BNB, octubre)"
              />
              <button
                onClick={save}
                disabled={!(value > 0) || saving}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/80 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Registrar liquidación"}
              </button>
              <p className="text-xs text-on-surface-variant">La agencia ve estos pagos en su panel, en Pagos → Cuenta con Chamba.</p>
            </div>

            {account.settlements.length > 0 && (
              <ul className="space-y-2 text-sm">
                {account.settlements.map((st) => (
                  <li key={st.id} className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <span>
                      {st.direction === "to_agency" ? "Chamba pagó" : "Agencia pagó"}
                      <span className="block text-xs text-on-surface-variant">
                        {new Date(st.createdAt).toLocaleDateString("es-BO")} {st.note ? `— ${st.note}` : ""}
                      </span>
                    </span>
                    <strong>{bs(st.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
