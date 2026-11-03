import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWorkModalities, updateWorkModalities } from "@/lib/admin-api";
import type { WorkModalitySettings } from "@/lib/types";

const OPTIONS: Array<{ key: keyof WorkModalitySettings; label: string; hint: string }> = [
  { key: "fixed", label: "Por trabajo", hint: "Precio cerrado por el trabajo completo." },
  { key: "hourly", label: "Por hora", hint: "Tarifa por hora × horas estimadas." },
  { key: "daily", label: "Por día", hint: "Jornada completa de 8 horas × días." },
];

/**
 * Modalidades de contratación. Una apagada deja de aparecer en la app y en
 * la web, y el backend rechaza solicitudes nuevas con ella. Las solicitudes
 * que ya existen no cambian.
 */
export function WorkModalitiesPanel() {
  const [saved, setSaved] = useState<WorkModalitySettings | null>(null);
  const [draft, setDraft] = useState<WorkModalitySettings>({ fixed: true, hourly: true, daily: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchWorkModalities()
      .then((value) => {
        if (!active) return;
        setSaved(value);
        setDraft(value);
      })
      .catch(() => toast.warning("No se pudieron cargar las modalidades"));
    return () => {
      active = false;
    };
  }, []);

  const enabledCount = OPTIONS.filter((option) => draft[option.key]).length;
  const dirty = saved !== null && OPTIONS.some((option) => saved[option.key] !== draft[option.key]);

  const toggle = (key: keyof WorkModalitySettings) => {
    if (draft[key] && enabledCount === 1) {
      toast.warning("Deja al menos una modalidad activa");
      return;
    }
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateWorkModalities(draft);
      setSaved(updated);
      setDraft(updated);
      toast.success("Modalidades actualizadas: la app y la web ya muestran solo las activas");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
        "No se pudieron guardar las modalidades";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
        <Briefcase className="w-4 h-4 text-primary" />
        Modalidades de contratación
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">
        Las apagadas dejan de aparecer en la app y en la web para solicitudes nuevas. Las que ya existen no
        cambian.
      </p>
      <ul className="mt-4 space-y-3">
        {OPTIONS.map((option) => {
          const on = draft[option.key];
          return (
            <li key={option.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-xs text-on-surface-variant">{option.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${option.label}: ${on ? "activa" : "apagada"}`}
                disabled={saved === null || saving}
                onClick={() => toggle(option.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? "bg-emerald-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    on ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <Button
        className="mt-5 w-full bg-primary text-white hover:bg-primary/90"
        onClick={save}
        disabled={!dirty || saving}
      >
        {saving ? "Guardando..." : "Guardar modalidades"}
      </Button>
    </div>
  );
}
