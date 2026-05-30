import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  type LayerProps,
  Popup,
  type MapRef,
  Source,
  type MapLayerMouseEvent,
} from "react-map-gl";
import { io } from "socket.io-client";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchMapSnapshot } from "@/lib/admin-api";
import type { MapClient, MapRequest, MapWorker } from "@/lib/types";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Users, Radio, MapPin, X, Crosshair, Navigation, Search } from "lucide-react";

type PanelTab = "workers" | "requests";
type WorkerFilter = "all" | "free" | "busy";

type PopupInfo =
  | { kind: "worker"; data: MapWorker; lng: number; lat: number }
  | { kind: "client"; data: MapClient; lng: number; lat: number }
  | { kind: "request"; data: MapRequest; lng: number; lat: number };

type GeoJsonPoint = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

/* ─── Layer definitions (static, never re-created) ─── */

const workerClusterLayer: LayerProps = {
  id: "worker-clusters",
  type: "circle",
  source: "workers",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#7c3aed",
    "circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 750, 30],
    "circle-opacity": 0.75,
    "circle-stroke-color": "#d2bbff",
    "circle-stroke-width": 1,
  },
};

const workerClusterCountLayer: LayerProps = {
  id: "worker-cluster-count",
  type: "symbol",
  source: "workers",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

const workerIconLayer: LayerProps = {
  id: "workers-unclustered",
  type: "symbol",
  source: "workers",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": [
      "case",
      ["==", ["get", "hasBusyRequest"], true],
      "worker-busy",
      ["==", ["get", "isAvailable"], true],
      "worker-free",
      "worker-offline",
    ],
    "icon-size": 0.9,
    "icon-allow-overlap": true,
  },
};

const clientIconLayer: LayerProps = {
  id: "clients-points",
  type: "symbol",
  source: "clients",
  layout: {
    "icon-image": "client-person",
    "icon-size": 0.85,
    "icon-allow-overlap": true,
  },
};

const requestIconLayer: LayerProps = {
  id: "requests-points",
  type: "symbol",
  source: "requests",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": "request-pin",
    "icon-size": 0.85,
    "icon-allow-overlap": true,
  },
};

const requestClusterLayer: LayerProps = {
  id: "request-clusters",
  type: "circle",
  source: "requests",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#eec200",
    "circle-radius": ["step", ["get", "point_count"], 16, 80, 22, 500, 28],
    "circle-opacity": 0.72,
    "circle-stroke-color": "#ffe083",
    "circle-stroke-width": 1,
  },
};

const requestClusterCountLayer: LayerProps = {
  id: "request-cluster-count",
  type: "symbol",
  source: "requests",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#231b00",
  },
};

const statusLabel: Record<string, string> = {
  searching: "Buscando",
  negotiating: "Negociando",
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
  pending: "Pendiente",
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  searching: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  negotiating: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
  assigned: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  in_progress: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  completed: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  cancelled: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
  pending: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" },
};

const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/* ─── SVG Icons ─── */
// Worker free (green hard hat - more visible)
const workerFreeSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='#166534' stroke='#22c55e' stroke-width='2'/><circle cx='24' cy='18' r='7' fill='#4ade80'/><path d='M17 25c0-3.87 3.13-7 7-7s7 3.13 7 7v2H17v-2z' fill='#22c55e'/><path d='M12 30c0-6.63 5.37-12 12-12s12 5.37 12 12v3H12v-3z' fill='#4ade80'/><circle cx='18' cy='38' r='2' fill='#86efac'/><circle cx='30' cy='38' r='2' fill='#86efac'/></svg>`;
// Worker busy (orange hard hat with tools)
const workerBusySvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='#7c2d12' stroke='#fb923c' stroke-width='2'/><circle cx='24' cy='18' r='7' fill='#fb923c'/><path d='M17 25c0-3.87 3.13-7 7-7s7 3.13 7 7v2H17v-2z' fill='#f97316'/><path d='M12 30c0-6.63 5.37-12 12-12s12 5.37 12 12v3H12v-3z' fill='#fdba74'/><text x='24' y='37' text-anchor='middle' font-size='8' fill='#7c2d12'>🔧</text></svg>`;
// Worker offline (gray)
const workerOfflineSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='#374151' stroke='#9ca3af' stroke-width='2'/><circle cx='24' cy='18' r='7' fill='#9ca3af'/><path d='M17 25c0-3.87 3.13-7 7-7s7 3.13 7 7v2H17v-2z' fill='#6b7280'/><path d='M12 30c0-6.63 5.37-12 12-12s12 5.37 12 12v3H12v-3z' fill='#d1d5db'/><circle cx='18' cy='38' r='2' fill='#9ca3af'/><circle cx='30' cy='38' r='2' fill='#9ca3af'/></svg>`;
// Client (person silhouette in blue pin)
const clientPersonSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 58'><path fill='#0ea5e9' d='M24 0C10.7 0 0 10.7 0 24c0 16 24 34 24 34s24-18 24-34C48 10.7 37.3 0 24 0z'/><circle cx='24' cy='18' r='7' fill='#fff'/><path fill='#fff' d='M12 36c2-7 7-11 12-11s10 4 12 11'/></svg>`;
// Request pin (yellow/amber)
const requestPinSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 58'><path fill='#f59e0b' d='M24 0C10.7 0 0 10.7 0 24c0 16 24 34 24 34s24-18 24-34C48 10.7 37.3 0 24 0z'/><circle cx='24' cy='22' r='8' fill='#fff'/><circle cx='24' cy='22' r='4' fill='#f59e0b'/></svg>`;

/* ─── Flush interval (ms) – higher = fewer re-renders during rapid moves ─── */
const FLUSH_INTERVAL_MS = 300;

const INTERACTIVE_LAYERS = ["workers-unclustered", "clients-points", "requests-points"];

export default function MapPage() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN || "";
  const mapRef = useRef<MapRef | null>(null);
  const [tab, setTab] = useState<PanelTab>("requests");
  const [panelOpen, setPanelOpen] = useState(true);
  const [workers, setWorkers] = useState<MapWorker[]>([]);
  const [clients, setClients] = useState<MapClient[]>([]);
  const [requests, setRequests] = useState<MapRequest[]>([]);
  const [workerFilter, setWorkerFilter] = useState<WorkerFilter>("all");
  const [workerSearch, setWorkerSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const lastSyncRef = useRef<string | undefined>(undefined);

  const workersMapRef = useRef<globalThis.Map<string, MapWorker>>(new globalThis.Map());
  const clientsMapRef = useRef<globalThis.Map<string, MapClient>>(new globalThis.Map());
  const requestsMapRef = useRef<globalThis.Map<string, MapRequest>>(new globalThis.Map());
  const workerRealtimeQueueRef = useRef<
    globalThis.Map<string, { latitude: number; longitude: number; timestamp: string }>
  >(new globalThis.Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const applySnapshot = useCallback((snapshot: { workers: MapWorker[]; clients: MapClient[]; requests: MapRequest[]; serverTime: string }) => {
    snapshot.workers.forEach((item) => workersMapRef.current.set(item.id, item));
    snapshot.clients.forEach((item) => clientsMapRef.current.set(item.id, item));
    snapshot.requests.forEach((item) => requestsMapRef.current.set(item.id, item));
    setWorkers(Array.from(workersMapRef.current.values()));
    setClients(Array.from(clientsMapRef.current.values()));
    setRequests(Array.from(requestsMapRef.current.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    lastSyncRef.current = snapshot.serverTime;
  }, []);

  const flushWorkerQueue = useCallback(() => {
    if (workerRealtimeQueueRef.current.size === 0) return;
    workerRealtimeQueueRef.current.forEach((payload, workerId) => {
      const current = workersMapRef.current.get(workerId);
      if (!current) return;
      workersMapRef.current.set(workerId, {
        ...current,
        latitude: payload.latitude,
        longitude: payload.longitude,
        updatedAt: payload.timestamp,
      });
    });
    workerRealtimeQueueRef.current.clear();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setWorkers(Array.from(workersMapRef.current.values()));
      rafRef.current = null;
    });
  }, []);

  const scheduleWorkerFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushWorkerQueue();
      flushTimerRef.current = null;
    }, FLUSH_INTERVAL_MS);
  }, [flushWorkerQueue]);

  useEffect(() => {
    let mounted = true;

    const load = async (since?: string) => {
      try {
        const snapshot = await fetchMapSnapshot(since);
        if (!mounted) return;
        applySnapshot(snapshot);
      } catch {
        if (!since) toast.error("No se pudo cargar snapshot de mapa desde backend");
      }
    };

    load();
    const interval = setInterval(() => {
      void load(lastSyncRef.current);
    }, 6000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [applySnapshot]);

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "").replace(/\/api$/, "");
    const socket = io(`${base}/realtime`, { transports: ["websocket"] });

    socket.on("connect_error", () => {
      toast.warning("Realtime socket no disponible, usando sync incremental");
    });

    socket.on("worker.location.updated", (payload: { workerId: string; latitude: number; longitude: number; timestamp: string }) => {
      if (!workersMapRef.current.has(payload.workerId)) return;
      workerRealtimeQueueRef.current.set(payload.workerId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: payload.timestamp,
      });
      scheduleWorkerFlush();
    });

    socket.on("request.published", (payload: { requestId: string; title: string; status: string; budget: number; address: string; latitude: number; longitude: number; timestamp: string }) => {
      const next: MapRequest = {
        id: payload.requestId,
        title: payload.title,
        status: payload.status,
        budget: payload.budget,
        address: payload.address,
        clientName: "Cliente",
        latitude: payload.latitude,
        longitude: payload.longitude,
        updatedAt: payload.timestamp,
      };
      requestsMapRef.current.set(next.id, next);
      setRequests(Array.from(requestsMapRef.current.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    });

    socket.on("request.status.updated", (payload: { requestId: string; status: string; timestamp: string }) => {
      const current = requestsMapRef.current.get(payload.requestId);
      if (!current) return;
      requestsMapRef.current.set(payload.requestId, {
        ...current,
        status: payload.status,
        updatedAt: payload.timestamp,
      });
      setRequests(Array.from(requestsMapRef.current.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    });

    // Listener para actualizaciones de ubicación de clientes en tiempo real
    socket.on("client.location.updated", (payload: { clientId: string; latitude: number; longitude: number; timestamp: string }) => {
      const current = clientsMapRef.current.get(payload.clientId);
      if (!current) return;
      clientsMapRef.current.set(payload.clientId, {
        ...current,
        latitude: payload.latitude,
        longitude: payload.longitude,
        updatedAt: payload.timestamp,
      });
      setClients(Array.from(clientsMapRef.current.values()));
    });

    return () => {
      socket.disconnect();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scheduleWorkerFlush]);

  /* ─── Filtered workers based on toggle and search ─── */
  const filteredWorkers = useMemo(() => {
    let result = workers;
    // Apply status filter
    if (workerFilter === "free") result = result.filter((w) => w.isAvailable && !w.activeRequest);
    if (workerFilter === "busy") result = result.filter((w) => !!w.activeRequest);
    // Apply search filter
    if (workerSearch.trim()) {
      const search = workerSearch.toLowerCase().trim();
      result = result.filter((w) =>
        `${w.firstName} ${w.lastName}`.toLowerCase().includes(search) ||
        w.completedJobs.toString().includes(search) ||
        w.averageRating.toString().includes(search)
      );
    }
    return result;
  }, [workers, workerFilter, workerSearch]);

  /* ─── Filtered requests based on search (includes client name) ─── */
  const filteredRequests = useMemo(() => {
    if (!requestSearch.trim()) return requests;
    const search = requestSearch.toLowerCase().trim();
    return requests.filter((r) =>
      r.title.toLowerCase().includes(search) ||
      r.clientName.toLowerCase().includes(search) ||
      r.address.toLowerCase().includes(search) ||
      r.status.toLowerCase().includes(search) ||
      r.budget.toString().includes(search)
    );
  }, [requests, requestSearch]);

  const workersGeo = useMemo<GeoJsonPoint>(() => ({
    type: "FeatureCollection",
    features: filteredWorkers.map((w) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [w.longitude, w.latitude] as [number, number] },
      properties: {
        id: w.id,
        name: `${w.firstName} ${w.lastName}`.trim(),
        isAvailable: w.isAvailable,
        hasBusyRequest: !!w.activeRequest,
      },
    })),
  }), [filteredWorkers]);

  const clientsGeo = useMemo<GeoJsonPoint>(() => ({
    type: "FeatureCollection",
    features: clients.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.longitude, c.latitude] as [number, number] },
      properties: { id: c.id, name: `${c.firstName} ${c.lastName}`.trim() },
    })),
  }), [clients]);

  const requestsGeo = useMemo<GeoJsonPoint>(() => ({
    type: "FeatureCollection",
    features: requests.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.longitude, r.latitude] as [number, number] },
      properties: { id: r.id, title: r.title, status: r.status },
    })),
  }), [requests]);

  const activeWorkers = useMemo(() => workers.filter((w) => w.isAvailable).length, [workers]);
  const busyWorkers = useMemo(() => workers.filter((w) => !!w.activeRequest).length, [workers]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const register = (name: string, svg: string) => {
      if (map.hasImage(name)) return;
      map.loadImage(svgToDataUrl(svg), (error, image) => {
        if (error || !image) return;
        map.addImage(name, image, { sdf: false });
      });
    };

    register("worker-free", workerFreeSvg);
    register("worker-busy", workerBusySvg);
    register("worker-offline", workerOfflineSvg);
    register("client-person", clientPersonSvg);
    register("request-pin", requestPinSvg);
  }, []);

  /* ─── Click handler for markers ─── */
  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || !feature.properties) { setPopup(null); return; }

      const coords = (feature.geometry as unknown as { coordinates: [number, number] }).coordinates;
      const [lng, lat] = coords;
      const props = feature.properties;
      const layerId = feature.layer?.id;

      if (layerId === "workers-unclustered") {
        const w = workersMapRef.current.get(props.id as string);
        if (w) setPopup({ kind: "worker", data: w, lng, lat });
      } else if (layerId === "clients-points") {
        const c = clientsMapRef.current.get(props.id as string);
        if (c) setPopup({ kind: "client", data: c, lng, lat });
      } else if (layerId === "requests-points") {
        const r = requestsMapRef.current.get(props.id as string);
        if (r) setPopup({ kind: "request", data: r, lng, lat });
      } else {
        setPopup(null);
      }
    },
    [],
  );

  const onMapMouseEnter = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (map && e.features?.length) {
      map.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const onMapMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "grab";
  }, []);

  const onMapMove = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map && map.getCanvas().style.cursor === "pointer") {
      map.getCanvas().style.cursor = "grab";
    }
  }, []);

  /* ─── Fly to coordinates (centra el mapa en una ubicación) ─── */
  const flyToLocation = useCallback((longitude: number, latitude: number, zoom = 15) => {
    const map = mapRef.current?.getMap();
    if (!map) {
      toast.error("Mapa no disponible");
      return;
    }
    map.flyTo({
      center: [longitude, latitude],
      zoom,
      essential: true,
      duration: 1500,
    });
    // Opcionalmente abrir popup en la ubicación
    setPopup(null);
  }, []);

  return (
    <section className="relative -mx-8 -mt-8 lg:-mx-12 lg:-mt-8 h-[calc(100vh-64px)] overflow-hidden">
      {/* ─── Stats overlay (top-left) ─── */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-surface-container-high/60 px-5 py-3 backdrop-blur-[20px]">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
            <Users size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{activeWorkers}</p>
            <p className="text-[10px] text-on-surface-variant">Libres</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20">
            <Radio size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{busyWorkers}</p>
            <p className="text-[10px] text-on-surface-variant">Ocupados</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20">
            <MapPin size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{requests.length}</p>
            <p className="text-[10px] text-on-surface-variant">Solicitudes</p>
          </div>
        </div>
      </div>

      {/* ─── Side panel overlay (right) ─── */}
      <div className={`absolute right-4 top-4 z-10 flex w-[340px] flex-col rounded-2xl border border-primary/20 bg-surface-container-high/70 backdrop-blur-[28px] transition-all duration-300 ${panelOpen ? "max-h-[calc(100%-2rem)]" : "max-h-[52px]"}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <button className={`rounded-full px-3 py-1 transition-colors ${tab === "requests" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`} onClick={() => setTab("requests")}>Solicitudes</button>
            <button className={`rounded-full px-3 py-1 transition-colors ${tab === "workers" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`} onClick={() => setTab("workers")}>Workers</button>
          </div>
          <button onClick={() => setPanelOpen((v) => !v)} className="text-on-surface-variant hover:text-on-surface">
            {panelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {panelOpen && (
          <div className="flex-1 overflow-auto px-4 pb-4">
            {tab === "requests" && (
              <div className="space-y-3">
                {/* Search input for requests */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Buscar por título, cliente, dirección..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                  />
                </div>
                {/* Results count */}
                <p className="text-xs text-on-surface-variant">
                  {filteredRequests.length} solicitude{filteredRequests.length !== 1 ? 's' : ''} encontrada{filteredRequests.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {filteredRequests.slice(0, 50).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => flyToLocation(r.longitude, r.latitude, 16)}
                      className="group cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 transition-all hover:bg-black/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
                            <span className="text-xs">📋</span>
                          </div>
                          <p className="truncate text-sm font-medium">{r.title}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              flyToLocation(r.longitude, r.latitude, 16);
                            }}
                            className="rounded-full p-1.5 text-on-surface-variant opacity-0 transition-all hover:bg-primary/20 hover:text-primary group-hover:opacity-100"
                            title="Centrar en mapa"
                          >
                            <Navigation size={14} />
                          </button>
                          {( () => {
                            const colors = statusColors[r.status] || statusColors.pending;
                            return (
                              <span className={`shrink-0 rounded-full border ${colors.border} ${colors.bg} px-2 py-0.5 text-[10px] uppercase ${colors.text}`}>
                                {statusLabel[r.status] ?? r.status}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">{r.clientName} · Bs {r.budget}</p>
                      <p className="truncate text-xs text-on-surface-variant">{r.address}</p>
                      <p className="mt-1 text-[10px] text-gray-500">
                        📍 {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "workers" && (
              <div className="space-y-3">
                {/* Search input for workers */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder="Buscar worker por nombre..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                  />
                </div>
                {/* Results count */}
                <p className="text-xs text-on-surface-variant">
                  {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} encontrado{filteredWorkers.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {filteredWorkers.slice(0, 50).map((w) => {
                    const isBusy = !!w.activeRequest;
                    return (
                      <div
                        key={w.id}
                        onClick={() => flyToLocation(w.longitude, w.latitude, 16)}
                        className="group cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 transition-all hover:bg-black/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isBusy ? "bg-orange-500/20" : w.isAvailable ? "bg-green-500/20" : "bg-gray-500/20"}`}>
                              <span className="text-sm">{isBusy ? "🔨" : "⛑️"}</span>
                            </div>
                            <p className="text-sm font-medium">{w.firstName} {w.lastName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                flyToLocation(w.longitude, w.latitude, 16);
                              }}
                              className="rounded-full p-1.5 text-on-surface-variant opacity-0 transition-all hover:bg-primary/20 hover:text-primary group-hover:opacity-100"
                              title="Centrar en mapa"
                            >
                              <Navigation size={14} />
                            </button>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${isBusy ? "bg-orange-500/20 text-orange-300" : w.isAvailable ? "bg-green-500/20 text-green-300" : "bg-gray-400/20 text-gray-300"}`}>
                              {isBusy ? "Ocupado" : w.isAvailable ? "Libre" : "Offline"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-on-surface-variant">Jobs: {w.completedJobs} · Rating: {w.averageRating.toFixed(1)}</p>
                        {w.activeRequest && (
                          <div className="mt-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
                            <p className="text-[11px] font-medium text-orange-300">{w.activeRequest.title}</p>
                            <p className="text-[10px] text-on-surface-variant">
                              {w.activeRequest.workerArrived ? "Ya llegó al lugar" : "En camino"} · {statusLabel[w.activeRequest.status] ?? w.activeRequest.status}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">Cliente: {w.activeRequest.clientName}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Filter toggles (bottom-center) ─── */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-md">
        {(["all", "free", "busy"] as const).map((f) => {
          const labels: Record<WorkerFilter, string> = { all: "Todos", free: "Libres", busy: "Ocupados" };
          const colors: Record<WorkerFilter, string> = {
            all: workerFilter === "all" ? "bg-primary/20 text-primary" : "",
            free: workerFilter === "free" ? "bg-green-500/20 text-green-300" : "",
            busy: workerFilter === "busy" ? "bg-orange-500/20 text-orange-300" : "",
          };
          return (
            <button
              key={f}
              onClick={() => setWorkerFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${colors[f] || "text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* ─── Full-size Map ─── */}
      <div className="absolute inset-0">
        {token ? (
          <Map
            ref={mapRef}
            onLoad={onMapLoad}
            onClick={onMapClick}
            onMouseEnter={onMapMouseEnter}
            onMouseLeave={onMapMouseLeave}
            onMove={onMapMove}
            interactiveLayerIds={INTERACTIVE_LAYERS}
            mapboxAccessToken={token}
            initialViewState={{ longitude: -68.15, latitude: -16.5, zoom: 11 }}
            maxZoom={18}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%" }}
            reuseMaps
            fadeDuration={0}
          >
            <Source id="workers" type="geojson" data={workersGeo} cluster clusterRadius={50} clusterMaxZoom={14}>
              <Layer {...workerClusterLayer} />
              <Layer {...workerClusterCountLayer} />
              <Layer {...workerIconLayer} />
            </Source>

            <Source id="clients" type="geojson" data={clientsGeo}>
              <Layer {...clientIconLayer} />
            </Source>

            <Source id="requests" type="geojson" data={requestsGeo} cluster clusterRadius={45} clusterMaxZoom={14}>
              <Layer {...requestClusterLayer} />
              <Layer {...requestClusterCountLayer} />
              <Layer {...requestIconLayer} />
            </Source>

            {/* ─── Popup on click ─── */}
            {popup && (
              <Popup
                longitude={popup.lng}
                latitude={popup.lat}
                anchor="bottom"
                onClose={() => setPopup(null)}
                closeButton={false}
                className="map-popup-custom"
                maxWidth="320px"
              >
                <div className="relative rounded-xl bg-[#1e1e2e] p-4 text-white shadow-2xl min-w-[260px]">
                  <button onClick={() => setPopup(null)} className="absolute right-2 top-2 text-gray-400 hover:text-white"><X size={14} /></button>

                  {popup.kind === "worker" && (() => {
                    const w = popup.data;
                    const isBusy = !!w.activeRequest;
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isBusy ? "bg-orange-500/20 border border-orange-500/30" : w.isAvailable ? "bg-green-500/20 border border-green-500/30" : "bg-gray-500/20 border border-gray-500/30"}`}>
                            {/* Worker Icon SVG - Person with hard hat */}
                            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                              <circle cx="12" cy="8" r="4" fill={isBusy ? "#fb923c" : w.isAvailable ? "#4ade80" : "#9ca3af"}/>
                              <path d="M6 22v-2c0-3.31 2.69-6 6-6s6 2.69 6 6v2" stroke={isBusy ? "#fb923c" : w.isAvailable ? "#4ade80" : "#9ca3af"} strokeWidth="2" fill="none"/>
                              <path d="M8 6h8c0-2.21-1.79-4-4-4s-4 1.79-4 4z" fill={isBusy ? "#c2410c" : w.isAvailable ? "#166534" : "#4b5563"}/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{w.firstName} {w.lastName}</p>
                            <span className={`text-[10px] font-medium ${isBusy ? "text-orange-400" : w.isAvailable ? "text-green-400" : "text-gray-400"}`}>
                              {isBusy ? "🛠️ Ocupado" : w.isAvailable ? "✅ Libre" : "⚪ Offline"}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-2">
                          <span>Rating: <b className="text-white">{w.averageRating.toFixed(1)} ⭐</b></span>
                          <span>Jobs: <b className="text-white">{w.completedJobs}</b></span>
                        </div>
                        <div className="mb-2 rounded-lg border border-white/10 bg-black/30 p-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Ubicación actual</p>
                          <p className="text-[11px] text-gray-300 font-mono">
                            📍 {w.latitude.toFixed(6)}, {w.longitude.toFixed(6)}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Actualizado: {new Date(w.updatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {w.activeRequest && (
                          <div className="mt-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                            <p className="text-[11px] font-semibold text-orange-300 mb-1">Solicitud activa</p>
                            <p className="text-xs text-gray-200 font-medium">{w.activeRequest.title}</p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {w.activeRequest.workerArrived ? "✅ Ya llegó al lugar" : "🚗 En camino al trabajo"}
                            </p>
                            <p className="text-[11px] text-gray-400">Estado: {statusLabel[w.activeRequest.status] ?? w.activeRequest.status}</p>
                            <p className="text-[11px] text-gray-400">📍 {w.activeRequest.address}</p>
                            <div className="mt-2 border-t border-white/10 pt-2">
                              <p className="text-[11px] text-gray-300">👤 Contratado por: <b className="text-sky-300">{w.activeRequest.clientName}</b></p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {popup.kind === "client" && (() => {
                    const c = popup.data;
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 border border-sky-500/30">
                            {/* Client Icon SVG */}
                            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                              <circle cx="12" cy="8" r="4" fill="#38bdf8"/>
                              <path d="M4 22v-2c0-3.31 2.69-6 6-6s6 2.69 6 6v2" stroke="#38bdf8" strokeWidth="2" fill="none"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{c.firstName} {c.lastName}</p>
                            <span className="text-[10px] text-sky-400">👤 Cliente</span>
                          </div>
                        </div>
                        <div className="mb-2 rounded-lg border border-white/10 bg-black/30 p-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Ubicación</p>
                          <p className="text-[11px] text-gray-300 font-mono">
                            📍 {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">Última actividad: {new Date(c.updatedAt).toLocaleString()}</p>
                      </>
                    );
                  })()}

                  {popup.kind === "request" && (() => {
                    const r = popup.data;
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30">
                            {/* Request Icon SVG - Clipboard */}
                            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                              <rect x="5" y="3" width="14" height="18" rx="2" stroke="#fbbf24" strokeWidth="2" fill="none"/>
                              <path d="M9 7h6M9 11h6M9 15h4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                              <circle cx="15" cy="3" r="3" fill="#f59e0b"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{r.title}</p>
                            <span className="text-[10px] text-amber-400">📋 {statusLabel[r.status] ?? r.status}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <p>👤 {r.clientName}</p>
                          <p>💰 Bs {r.budget}</p>
                          <p>📍 {r.address}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Popup>
            )}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center bg-black/40 text-on-surface-variant">Configura VITE_MAPBOX_TOKEN para el mapa</div>
        )}
      </div>
    </section>
  );
}
