import { useEffect, useMemo, useState, Fragment } from "react";
import { fetchApiLogs } from "@/lib/admin-api";
import type { ExtendedApiLogItem } from "@/lib/types";
import { toast } from "sonner";
import { Copy } from "lucide-react";

const METHODS = ["", "GET", "POST", "PATCH", "PUT", "DELETE"];

function statusClass(status: number) {
  if (status >= 500) return "bg-rose-500/20 text-rose-200";
  if (status >= 400) return "bg-amber-500/20 text-amber-200";
  if (status >= 300) return "bg-sky-500/20 text-sky-200";
  return "bg-emerald-500/20 text-emerald-200";
}

export default function LogsPage() {
  const [items, setItems] = useState<ExtendedApiLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState({ total: 0, total4xx: 0, total5xx: 0, avgMs: 0 });
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [statusMin, setStatusMin] = useState("");
  const [statusMax, setStatusMax] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleCopy = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Copiado al portapapeles");
    }).catch(() => {
      toast.error("Error al copiar");
    });
  };

  const filters = useMemo(
    () => ({
      limit: 120,
      method: method || undefined,
      search: search.trim() || undefined,
      statusMin: statusMin ? Number(statusMin) : undefined,
      statusMax: statusMax ? Number(statusMax) : undefined,
    }),
    [method, search, statusMin, statusMax],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchApiLogs(filters);
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setMetrics(data.metrics15m);
      } catch {
        if (active) toast.error("No se pudieron cargar logs");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    if (!autoRefresh) {
      return () => {
        active = false;
      };
    }

    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [filters, autoRefresh]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">API Logs Monitor</h2>
        <p className="mt-2 text-on-surface-variant">
          Vista de trafico HTTP del backend (entradas/salidas) estilo consola operativa.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="glass-panel rounded-xl p-4"><p className="text-xs text-on-surface-variant">Logs (15m)</p><p className="text-3xl font-semibold">{metrics.total}</p></div>
        <div className="glass-panel rounded-xl p-4"><p className="text-xs text-on-surface-variant">Errores 4xx</p><p className="text-3xl font-semibold text-amber-300">{metrics.total4xx}</p></div>
        <div className="glass-panel rounded-xl p-4"><p className="text-xs text-on-surface-variant">Errores 5xx</p><p className="text-3xl font-semibold text-rose-300">{metrics.total5xx}</p></div>
        <div className="glass-panel rounded-xl p-4"><p className="text-xs text-on-surface-variant">Tiempo medio</p><p className="text-3xl font-semibold">{metrics.avgMs} ms</p></div>
      </div>

      <div className="glass-panel rounded-xl p-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          <select className="glass-input rounded-lg px-3 py-2" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m || "Todos los metodos"}</option>
            ))}
          </select>
          <input className="glass-input rounded-lg px-3 py-2" placeholder="Buscar por path o error" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="glass-input rounded-lg px-3 py-2" placeholder="Status min (ej 200)" value={statusMin} onChange={(e) => setStatusMin(e.target.value)} />
          <input className="glass-input rounded-lg px-3 py-2" placeholder="Status max (ej 599)" value={statusMax} onChange={(e) => setStatusMax(e.target.value)} />
          <button className={`rounded-lg px-3 py-2 text-sm ${autoRefresh ? "bg-primary/20 text-primary" : "bg-white/10 text-on-surface-variant"}`} onClick={() => setAutoRefresh((v) => !v)}>
            Auto refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button className={`rounded-lg px-3 py-2 text-sm ${search === "[AI]" ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-on-surface-variant"}`} onClick={() => setSearch(search === "[AI]" ? "" : "[AI]")}>
            🤖 Solo IA
          </button>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-sm text-on-surface-variant">Total: {total}</div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-6 text-sm text-on-surface-variant">Cargando logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  {["Fecha", "Metodo", "Status", "Tiempo", "Path", "IP", "Error"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <Fragment key={row.id}>
                    <tr 
                      className="border-b border-white/5 align-top cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs">{row.method}</td>
                      <td className="px-4 py-3 text-xs"><span className={`rounded px-2 py-1 ${statusClass(row.status_code)}`}>{row.status_code}</span></td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{row.duration_ms} ms</td>
                      <td className="px-4 py-3 text-xs break-all">{row.path}</td>
                      <td className="px-4 py-3 text-xs">{row.ip || "-"}</td>
                      <td className="px-4 py-3 text-xs text-rose-200 break-all">{row.error_message || "-"}</td>
                    </tr>
                    {expandedId === row.id && (
                      <tr className="bg-black/20 border-b border-white/5">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Request Body (JSON)</p>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCopy(JSON.stringify(row.request_body_json, null, 2)); }}
                                  className="text-on-surface-variant hover:text-primary transition-colors"
                                  title="Copiar JSON"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                              <pre className="bg-black/60 border border-white/10 p-3 rounded-lg text-xs text-emerald-200 overflow-auto max-h-60">
                                {JSON.stringify(row.request_body_json, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Response Preview / Query</p>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCopy(row.response_preview || JSON.stringify(row.query_json, null, 2) || ""); }}
                                  className="text-on-surface-variant hover:text-primary transition-colors"
                                  title="Copiar respuesta"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                              <pre className="bg-black/60 border border-white/10 p-3 rounded-lg text-xs text-sky-200 overflow-auto max-h-60 whitespace-pre-wrap">
                                {row.response_preview || JSON.stringify(row.query_json, null, 2) || "Sin respuesta"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

