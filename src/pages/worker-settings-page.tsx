import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchWorkerNotificationSettings,
  updateWorkerNotificationSettings,
} from "@/lib/admin-api";

const DEMO_WORKERS = [
  { id: "w1", name: "Ariana", x: 20, y: 30 },
  { id: "w2", name: "Mateo", x: 48, y: 42 },
  { id: "w3", name: "Lucia", x: 68, y: 62 },
  { id: "w4", name: "Daniel", x: 36, y: 74 },
];

function radiusToPixels(radiusKm: number) {
  return Math.min(180, Math.max(35, radiusKm * 18));
}

export default function WorkerSettingsPage() {
  const [radiusKm, setRadiusKm] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await fetchWorkerNotificationSettings();
        if (!active) return;
        setRadiusKm(Number(settings.radiusKm || 2));
      } catch {
        toast.warning("No se pudo cargar configuracion, usando valor local");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const px = useMemo(() => radiusToPixels(radiusKm), [radiusKm]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateWorkerNotificationSettings(radiusKm);
      setRadiusKm(Number(updated.radiusKm || radiusKm));
      toast.success(`Radio actualizado a ${Number(updated.radiusKm).toFixed(1)} km`);
    } catch {
      toast.error("No se pudo guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuracion de Workers</h2>
        <p className="mt-2 text-on-surface-variant">
          Define el radio maximo desde la solicitud para enviar notificaciones de trabajo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-sm text-on-surface-variant">Radio de notificacion</p>
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
            Solo workers dentro de este rango recibiran solicitud. Fuera de rango no aparece.
          </p>
          <Button
            className="mt-5 w-full bg-primary-container text-white"
            onClick={save}
            disabled={loading || saving}
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </Button>
        </div>

        <div className="glass-panel relative overflow-hidden rounded-2xl p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(147,197,253,0.14),transparent_36%),linear-gradient(to_bottom,rgba(255,255,255,0.03),rgba(0,0,0,0.08))]" />
          <div className="relative">
            <h3 className="text-lg font-semibold">Simulacion visual de cobertura</h3>
            <p className="text-sm text-on-surface-variant">
              Pin central = solicitud del cliente. Circulo = alcance de notificacion.
            </p>

            <div className="relative mt-4 h-[420px] rounded-xl border border-white/10 bg-black/25">
              <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2">
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300/80 bg-sky-400/15 transition-all duration-500"
                  style={{ width: `${px * 2}px`, height: `${px * 2}px` }}
                />
                <div className="absolute -translate-x-1/2 -translate-y-1/2">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill="#38bdf8" />
                    <circle cx="12" cy="10" r="3" fill="#082f49" />
                  </svg>
                </div>
              </div>

              {DEMO_WORKERS.map((w) => (
                <div
                  key={w.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${w.x}%`, top: `${w.y}%` }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill="#f59e0b" />
                    <circle cx="12" cy="10" r="3" fill="#451a03" />
                  </svg>
                  <p className="mt-1 text-center text-[11px] text-on-surface-variant">{w.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
