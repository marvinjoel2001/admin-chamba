import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchWorkerNotificationSettings,
  updateWorkerNotificationSettings,
  fetchOfferLifetimeSettings,
  updateOfferLifetimeSettings,
  fetchMapSnapshot,
} from "@/lib/admin-api";
import type { MapWorker } from "@/lib/types";
import { Clock, Radio, Save } from "lucide-react";

function radiusToPixels(radiusKm: number) {
  return Math.min(180, Math.max(35, radiusKm * 18));
}

export default function WorkerSettingsPage() {
  const [radiusKm, setRadiusKm] = useState(2);
  const [activeWorkers, setActiveWorkers] = useState<MapWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ofertas tiempos de expiración
  const [offerLifetime, setOfferLifetime] = useState({
    fixed: 30, // minutos
    hour: 30,
    day: 60,
  });
  const [savingOffers, setSavingOffers] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [settings, offers, snapshot] = await Promise.all([
          fetchWorkerNotificationSettings().catch(() => ({ radiusKm: 2 })),
          fetchOfferLifetimeSettings().catch(() => ({ fixed: 30, hour: 30, day: 60 })),
          fetchMapSnapshot().catch(() => ({ workers: [] })),
        ]);

        if (!active) return;
        setRadiusKm(Number(settings.radiusKm || 2));
        if (offers) {
          setOfferLifetime({
            fixed: Number(offers.fixed || 30),
            hour: Number(offers.hour || 30),
            day: Number(offers.day || 60),
          });
        }
        if (snapshot?.workers) {
          setActiveWorkers(snapshot.workers.slice(0, 8));
        }
      } catch {
        toast.warning("No se pudo cargar configuración del servidor");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const px = useMemo(() => radiusToPixels(radiusKm), [radiusKm]);

  const saveRadius = async () => {
    setSaving(true);
    try {
      const updated = await updateWorkerNotificationSettings(radiusKm);
      setRadiusKm(Number(updated.radiusKm || radiusKm));
      toast.success(`Radio actualizado a ${Number(updated.radiusKm).toFixed(1)} km`);
    } catch {
      toast.error("No se pudo guardar el radio");
    } finally {
      setSaving(false);
    }
  };

  const saveOfferLifetimes = async () => {
    setSavingOffers(true);
    try {
      await updateOfferLifetimeSettings(offerLifetime);
      toast.success("Tiempos de vigencia de ofertas actualizados");
    } catch {
      toast.error("No se pudieron guardar los tiempos de oferta");
    } finally {
      setSavingOffers(false);
    }
  };

  // Coordenadas calculadas en porcentaje para los workers reales o muestra referencial
  const visualWorkers = useMemo(() => {
    if (activeWorkers.length > 0) {
      return activeWorkers.map((w, idx) => {
        // Distribuir uniformemente alrededor del centro en base a su índice
        const angle = (idx / activeWorkers.length) * 2 * Math.PI;
        const dist = 20 + (idx % 3) * 22; // % del centro
        return {
          id: w.id,
          name: `${w.firstName} ${w.lastName || ""}`.trim(),
          isReal: true,
          x: 50 + Math.cos(angle) * dist,
          y: 50 + Math.sin(angle) * dist,
        };
      });
    }

    // Si no hay trabajadores conectados en este momento, mostrar puntos referenciales transparentes
    return [
      { id: "ref-1", name: "Punto de Cobertura A", isReal: false, x: 30, y: 35 },
      { id: "ref-2", name: "Punto de Cobertura B", isReal: false, x: 70, y: 40 },
      { id: "ref-3", name: "Punto de Cobertura C", isReal: false, x: 38, y: 72 },
    ];
  }, [activeWorkers]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración de Trabajadores</h2>
        <p className="mt-2 text-on-surface-variant">
          Define el radio de notificación geográfico y los tiempos de expiración de ofertas en la app.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="flex flex-col gap-6">
          {/* Panel de Radio */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
              <Radio className="w-4 h-4 text-primary" />
              Radio de Notificación
            </div>
            <div className="mt-2 text-4xl font-semibold text-primary">{radiusKm.toFixed(1)} km</div>
            <input
              className="mt-5 w-full accent-primary"
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              disabled={loading || saving}
            />
            <p className="mt-3 text-xs text-on-surface-variant">
              Solo los trabajadores dentro de este radio recibirán la alerta inicial de solicitud.
            </p>
            <Button
              className="mt-5 w-full bg-primary text-white hover:bg-primary/90"
              onClick={saveRadius}
              disabled={loading || saving}
            >
              {saving ? "Guardando..." : "Guardar Radio"}
            </Button>
          </div>

          {/* Panel de Tiempos de Ofertas */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium mb-4">
              <Clock className="w-4 h-4 text-amber-400" />
              Vigencia de Ofertas (Minutos)
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-on-surface-variant block mb-1">Precio Fijo (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={offerLifetime.fixed}
                  onChange={(e) => setOfferLifetime({ ...offerLifetime, fixed: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-on-surface-variant block mb-1">Por Hora (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={offerLifetime.hour}
                  onChange={(e) => setOfferLifetime({ ...offerLifetime, hour: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-on-surface-variant block mb-1">Por Día (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={offerLifetime.day}
                  onChange={(e) => setOfferLifetime({ ...offerLifetime, day: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary outline-none"
                />
              </div>
            </div>
            <Button
              className="mt-5 w-full bg-amber-600 text-white hover:bg-amber-500"
              onClick={saveOfferLifetimes}
              disabled={loading || savingOffers}
            >
              {savingOffers ? "Guardando..." : "Guardar Tiempos"}
            </Button>
          </div>
        </div>

        {/* Simulación visual de cobertura */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(147,197,253,0.14),transparent_36%),linear-gradient(to_bottom,rgba(255,255,255,0.03),rgba(0,0,0,0.08))]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Simulación visual de cobertura</h3>
                <p className="text-sm text-on-surface-variant">
                  Pin central = solicitud del cliente. Círculo celeste = alcance {radiusKm.toFixed(1)} km.
                </p>
              </div>
              {activeWorkers.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300 font-medium">
                  {activeWorkers.length} trabajadores activos
                </span>
              )}
            </div>

            <div className="relative mt-4 h-[440px] rounded-xl border border-white/10 bg-black/25">
              <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2">
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300/80 bg-sky-400/15 transition-all duration-500 shadow-[0_0_30px_rgba(56,189,248,0.2)]"
                  style={{ width: `${px * 2}px`, height: `${px * 2}px` }}
                />
                <div className="absolute -translate-x-1/2 -translate-y-1/2">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill="#38bdf8" />
                    <circle cx="12" cy="10" r="3" fill="#082f49" />
                  </svg>
                </div>
              </div>

              {visualWorkers.map((w) => (
                <div
                  key={w.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${w.x}%`, top: `${w.y}%` }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill={w.isReal ? "#10b981" : "#f59e0b"} />
                    <circle cx="12" cy="10" r="3" fill="#0f172a" />
                  </svg>
                  <p className="mt-0.5 text-center text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm max-w-[90px] truncate">
                    {w.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
