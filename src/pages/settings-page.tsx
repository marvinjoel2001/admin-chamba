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
    nvidiaModel: "meta/llama-3.1-8b-instruct",
    deepseekKey: "",
  });
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

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

  const handleTestAi = async () => {
    if (!testMessage.trim()) {
      toast.error("Ingresa un mensaje para probar");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Usamos el endpoint de preview que dispara internamente el LLM
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/mobile/request-categories/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: testMessage })
      });
      if (!res.ok) throw new Error("Error en el servidor");
      const data = await res.json();
      setTestResult(data);
      toast.success("¡Prueba exitosa!");
    } catch (e) {
      toast.error("La prueba falló. Revisa tus API keys.");
      setTestResult({ error: String(e) });
    } finally {
      setTesting(false);
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

            <div className={`p-4 rounded-xl border space-y-3 ${aiConfig.activeProvider === 'nvidia' ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
              <div>
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
              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Modelo de Nvidia
                </label>
                <Input
                  placeholder="meta/llama-3.1-8b-instruct"
                  value={aiConfig.nvidiaModel}
                  onChange={(e) => setAiConfig({ ...aiConfig, nvidiaModel: e.target.value })}
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  Recomendado: <code className="text-sky-300">meta/llama-3.1-8b-instruct</code> (~1s) · Potente: <code className="text-sky-300">meta/llama-3.3-70b-instruct</code> (~3s) · Razonamiento: <code className="text-sky-300">minimaxai/minimax-m2.7</code> (~25s)
                </p>
              </div>
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

            {/* AI Test Section */}
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="mb-3 text-lg font-bold">Probar Inteligencia Artificial</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Envía una descripción de prueba para verificar si el LLM configurado responde correctamente y genera las categorías. Esto también aparecerá en tus API Logs.
              </p>
              <p className="text-xs text-yellow-400/80 mb-4">
                ⚠ El modelo de razonamiento (Minimax M2.7) tarda entre 20 y 40 segundos en responder. Es normal que el botón permanezca en "Esperando..." durante ese tiempo.
              </p>
              <div className="flex gap-3">
                <Input 
                  placeholder="Ej: Necesito un plomero para arreglar una fuga..." 
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestAi}
                  disabled={testing}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  {testing ? "Esperando respuesta (~20s)..." : "Probar LLM"}
                </Button>
              </div>
              
              {testResult && (
                <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Respuesta de la IA</p>
                  <pre className="text-xs text-sky-200 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
