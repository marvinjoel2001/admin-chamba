import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchAiConfig, updateAiConfig } from "@/lib/admin-api";
import type { AiConfig } from "@/lib/types";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    activeProvider: "nvidia",
    geminiKey: "",
    nvidiaKey: "",
    deepseekKey: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await fetchAiConfig();
      setAiConfig(config);
    } catch {
      toast.error("Error al cargar la configuración de IA");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAiConfig(aiConfig);
      toast.success("Configuración de IA guardada");
    } catch {
      toast.error("Error al guardar la configuración de IA");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Configuración del Sistema</h1>
        <p className="text-sm text-on-surface-variant">
          Gestiona las preferencias y claves de acceso globales.
        </p>
      </div>

      <section className="glass-panel max-w-2xl rounded-2xl p-6">
        <h2 className="mb-4 text-xl font-bold">Variables de Entorno Locales</h2>
        <div className="space-y-4">
          <Input 
            placeholder="API URL" 
            defaultValue={import.meta.env.VITE_API_URL || "http://localhost:3000"} 
            disabled 
          />
          <Input 
            placeholder="Mapbox Token" 
            defaultValue={import.meta.env.VITE_MAPBOX_TOKEN || ""} 
            disabled 
          />
          <p className="text-xs text-on-surface-variant">Estas variables se configuran en tu archivo .env local</p>
        </div>
      </section>

      <section className="glass-panel max-w-2xl rounded-2xl p-6">
        <h2 className="mb-4 text-xl font-bold">Inteligencia Artificial</h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Configura el proveedor de inteligencia artificial que analizará y categorizará las solicitudes de los clientes.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Proveedor Activo
              </label>
              <select
                value={aiConfig.activeProvider}
                onChange={(e) => setAiConfig({ ...aiConfig, activeProvider: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="nvidia" className="bg-[#0d1117]">Nvidia (Minimax)</option>
                <option value="gemini" className="bg-[#0d1117]">Google Gemini</option>
                <option value="deepseek" className="bg-[#0d1117]">DeepSeek</option>
              </select>
            </div>

            <div className={`p-4 rounded-xl border ${aiConfig.activeProvider === 'nvidia' ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
              <label className="mb-1 block text-sm font-medium text-white">
                API Key de Nvidia (integrate.api.nvidia.com)
              </label>
              <Input 
                type="password"
                placeholder="nvapi-..." 
                value={aiConfig.nvidiaKey}
                onChange={(e) => setAiConfig({ ...aiConfig, nvidiaKey: e.target.value })}
              />
            </div>

            <div className={`p-4 rounded-xl border ${aiConfig.activeProvider === 'gemini' ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
              <label className="mb-1 block text-sm font-medium text-white">
                API Key de Google Gemini
              </label>
              <Input 
                type="password"
                placeholder="AIzaSy..." 
                value={aiConfig.geminiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, geminiKey: e.target.value })}
              />
            </div>

            <div className={`p-4 rounded-xl border ${aiConfig.activeProvider === 'deepseek' ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
              <label className="mb-1 block text-sm font-medium text-white">
                API Key de DeepSeek
              </label>
              <Input 
                type="password"
                placeholder="sk-..." 
                value={aiConfig.deepseekKey}
                onChange={(e) => setAiConfig({ ...aiConfig, deepseekKey: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <Button 
                className="bg-primary text-white hover:bg-primary/80" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar Configuración IA"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
