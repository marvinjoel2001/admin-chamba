import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchAiConfig, updateAiConfig } from "@/lib/admin-api";
import type { AiConfig } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const NVIDIA_MODELS = [
  { value: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B — Rápido (~1s) ✦ Recomendado" },
  { value: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B — Calidad alta (~3s)" },
  { value: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B — Calidad alta (~3s)" },
  { value: "mistralai/mistral-7b-instruct-v0.3", label: "Mistral 7B — Muy rápido (~1s)" },
  { value: "mistralai/mixtral-8x7b-instruct-v0.1", label: "Mixtral 8x7B — Balance (~2s)" },
  { value: "minimaxai/minimax-m2.7", label: "MiniMax M2.7 — Razonamiento (~25s)" },
  { value: "custom", label: "Personalizado..." },
];

type ProviderStatus = { ok: boolean; model?: string; durationMs?: number; error?: string } | null;

type AiStatusResult = {
  nvidia: ProviderStatus;
  gemini: ProviderStatus;
  deepseek: ProviderStatus;
};

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
  const [nvidiaModelMode, setNvidiaModelMode] = useState<"select" | "custom">("select");

  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiStatusResult | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await fetchAiConfig();
      setAiConfig(config);
      const isPreset = NVIDIA_MODELS.some(
        (m) => m.value !== "custom" && m.value === config.nvidiaModel,
      );
      setNvidiaModelMode(isPreset ? "select" : "custom");
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
      const res = await fetch(`${API_BASE}/mobile/admin/ai-config/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) toast.success(`Respuesta recibida en ${data.durationMs}ms`);
      else toast.error("La IA no respondió correctamente");
    } catch (e) {
      toast.error("Error de conexión con el servidor");
      setTestResult({ ok: false, error: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setAiStatus(null);
    try {
      const res = await fetch(`${API_BASE}/mobile/admin/ai-config/status`);
      const data: AiStatusResult = await res.json();
      setAiStatus(data);
    } catch {
      toast.error("Error al comprobar el estado");
    } finally {
      setCheckingStatus(false);
    }
  };

  const StatusBadge = ({ status }: { status: ProviderStatus }) => {
    if (!status) return <span className="text-xs text-white/30">—</span>;
    if (status.ok)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          ✓ OK {status.durationMs ? `· ${status.durationMs}ms` : ""}
        </span>
      );
    return (
      <span
        title={status.error}
        className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
      >
        ✕ Error
      </span>
    );
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
          <Input placeholder="API URL" defaultValue={API_BASE} disabled />
          <Input
            placeholder="Mapbox Token"
            defaultValue={import.meta.env.VITE_MAPBOX_TOKEN || ""}
            disabled
          />
          <p className="text-xs text-on-surface-variant">
            Estas variables se configuran en tu archivo .env local
          </p>
        </div>
      </section>

      <section className="glass-panel max-w-2xl rounded-2xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Inteligencia Artificial</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Configura el proveedor que clasificará las solicitudes de trabajo.
            </p>
          </div>
          <Button
            onClick={handleCheckStatus}
            disabled={checkingStatus}
            className="shrink-0 bg-white/10 text-white hover:bg-white/20"
          >
            {checkingStatus ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                Comprobando...
              </span>
            ) : (
              "Comprobar estado"
            )}
          </Button>
        </div>

        {/* Status indicators */}
        {aiStatus && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {(
              [
                { key: "nvidia", label: "Nvidia" },
                { key: "gemini", label: "Gemini" },
                { key: "deepseek", label: "DeepSeek" },
              ] as const
            ).map(({ key, label }) => (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
              >
                <p className="mb-1.5 text-xs font-medium text-white/60">{label}</p>
                <StatusBadge status={aiStatus[key]} />
                {aiStatus[key]?.ok && aiStatus[key]?.model && (
                  <p className="mt-1 truncate text-[10px] text-white/40">
                    {aiStatus[key]!.model}
                  </p>
                )}
                {!aiStatus[key]?.ok && aiStatus[key]?.error && (
                  <p className="mt-1 truncate text-[10px] text-red-400/70">
                    {aiStatus[key]!.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Provider selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Proveedor Activo
              </label>
              <select
                value={aiConfig.activeProvider}
                onChange={(e) => setAiConfig({ ...aiConfig, activeProvider: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="nvidia" className="bg-[#0d1117]">Nvidia NIM</option>
                <option value="gemini" className="bg-[#0d1117]">Google Gemini</option>
                <option value="deepseek" className="bg-[#0d1117]">DeepSeek</option>
              </select>
            </div>

            {/* NVIDIA */}
            <div
              className={`space-y-3 rounded-xl border p-4 ${aiConfig.activeProvider === "nvidia" ? "border-primary/50 bg-primary/5" : "border-white/10 bg-white/5"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Nvidia NIM
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">API Key</label>
                <Input
                  type="password"
                  placeholder="nvapi-..."
                  value={aiConfig.nvidiaKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, nvidiaKey: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">Modelo</label>
                {nvidiaModelMode === "select" ? (
                  <select
                    value={aiConfig.nvidiaModel}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setNvidiaModelMode("custom");
                        setAiConfig({ ...aiConfig, nvidiaModel: "" });
                      } else {
                        setAiConfig({ ...aiConfig, nvidiaModel: e.target.value });
                      }
                    }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {NVIDIA_MODELS.map((m) => (
                      <option key={m.value} value={m.value} className="bg-[#0d1117]">
                        {m.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="org/model-name"
                      value={aiConfig.nvidiaModel}
                      onChange={(e) => setAiConfig({ ...aiConfig, nvidiaModel: e.target.value })}
                      className="flex-1"
                    />
                    <button
                      onClick={() => setNvidiaModelMode("select")}
                      className="shrink-0 rounded-lg border border-white/10 px-3 text-xs text-white/60 hover:text-white"
                    >
                      Lista
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gemini */}
            <div
              className={`rounded-xl border p-4 ${aiConfig.activeProvider === "gemini" ? "border-primary/50 bg-primary/5" : "border-white/10 bg-white/5"}`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Google Gemini
              </p>
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={aiConfig.geminiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, geminiKey: e.target.value })}
              />
            </div>

            {/* DeepSeek */}
            <div
              className={`rounded-xl border p-4 ${aiConfig.activeProvider === "deepseek" ? "border-primary/50 bg-primary/5" : "border-white/10 bg-white/5"}`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                DeepSeek
              </p>
              <Input
                type="password"
                placeholder="sk-..."
                value={aiConfig.deepseekKey}
                onChange={(e) => setAiConfig({ ...aiConfig, deepseekKey: e.target.value })}
              />
            </div>

            <div className="pt-2">
              <Button
                className="bg-primary text-white hover:bg-primary/80"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar configuración"}
              </Button>
            </div>

            {/* Test section */}
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="mb-1 text-base font-bold">Probar IA</h3>
              <p className="mb-4 text-sm text-on-surface-variant">
                Envía cualquier mensaje al modelo activo y ve su respuesta directamente. También
                puedes describir una solicitud de trabajo para ver cómo la clasifica.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Ej: ¿Cuál es la capital de Bolivia? · O: necesito un electricista..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !testing && handleTestAi()}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestAi}
                  disabled={testing}
                  className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      Esperando...
                    </span>
                  ) : (
                    "Probar"
                  )}
                </Button>
              </div>

              {testResult && (
                <div className="mt-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    {testResult.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        ✓ Respuesta recibida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        ✕ Error
                      </span>
                    )}
                    {testResult.model && (
                      <span className="text-xs text-white/40">{testResult.model}</span>
                    )}
                    {testResult.durationMs && (
                      <span className="text-xs text-white/30">{testResult.durationMs}ms</span>
                    )}
                  </div>

                  {/* Response text */}
                  {testResult.response && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400/60">
                        Respuesta del modelo
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-emerald-100">
                        {testResult.response}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {testResult.error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4">
                      <p className="text-sm text-red-300">{testResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
