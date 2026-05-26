import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  type LayerProps,
  type MapRef,
  Source,
} from "react-map-gl";
import { io } from "socket.io-client";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchMapSnapshot } from "@/lib/admin-api";
import type { MapClient, MapRequest, MapWorker } from "@/lib/types";
import { toast } from "sonner";

type PanelTab = "workers" | "requests";

type GeoJsonPoint = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

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
    "icon-image": ["case", ["==", ["get", "isAvailable"], true], "worker-helmet", "worker-helmet-off"],
    "icon-size": 0.9,
    "icon-allow-overlap": true,
  },
};

const clientIconLayer: LayerProps = {
  id: "clients-points",
  type: "symbol",
  source: "clients",
  layout: {
    "icon-image": "client-dot",
    "icon-size": 0.72,
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
  assigned: "Asignada",
  in_progress: "En progreso",
};

const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const workerHelmetSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path fill='#d2bbff' d='M32 8c-12.2 0-22 9.8-22 22v6h8v10h28V36h8v-6c0-12.2-9.8-22-22-22zm0 8c7.7 0 14 6.3 14 14v2H18v-2c0-7.7 6.3-14 14-14z'/><circle cx='24' cy='52' r='4' fill='#d2bbff'/><circle cx='40' cy='52' r='4' fill='#d2bbff'/></svg>`;
const workerHelmetOffSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path fill='#6b7280' d='M32 8c-12.2 0-22 9.8-22 22v6h8v10h28V36h8v-6c0-12.2-9.8-22-22-22zm0 8c7.7 0 14 6.3 14 14v2H18v-2c0-7.7 6.3-14 14-14z'/><circle cx='24' cy='52' r='4' fill='#6b7280'/><circle cx='40' cy='52' r='4' fill='#6b7280'/></svg>`;
const clientSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><circle cx='24' cy='24' r='20' fill='#38bdf8'/><circle cx='24' cy='18' r='7' fill='#0f172a'/><path d='M10 38c2.6-7.2 8.1-11 14-11s11.4 3.8 14 11' fill='#0f172a'/></svg>`;
const requestPinSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='#ffe083' d='M24 4c-8.3 0-15 6.7-15 15 0 10.5 15 25 15 25s15-14.5 15-25c0-8.3-6.7-15-15-15zm0 20a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/></svg>`;

export default function MapPage() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN || "";
  const mapRef = useRef<MapRef | null>(null);
  const [tab, setTab] = useState<PanelTab>("requests");
  const [workers, setWorkers] = useState<MapWorker[]>([]);
  const [clients, setClients] = useState<MapClient[]>([]);
  const [requests, setRequests] = useState<MapRequest[]>([]);
  const lastSyncRef = useRef<string | undefined>(undefined);

  const workersMapRef = useRef<globalThis.Map<string, MapWorker>>(new globalThis.Map());
  const clientsMapRef = useRef<globalThis.Map<string, MapClient>>(new globalThis.Map());
  const requestsMapRef = useRef<globalThis.Map<string, MapRequest>>(new globalThis.Map());
  const workerRealtimeQueueRef = useRef<
    globalThis.Map<string, { latitude: number; longitude: number; timestamp: string }>
  >(new globalThis.Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySnapshot = (snapshot: { workers: MapWorker[]; clients: MapClient[]; requests: MapRequest[]; serverTime: string }) => {
    snapshot.workers.forEach((item) => workersMapRef.current.set(item.id, item));
    snapshot.clients.forEach((item) => clientsMapRef.current.set(item.id, item));
    snapshot.requests.forEach((item) => requestsMapRef.current.set(item.id, item));
    setWorkers(Array.from(workersMapRef.current.values()));
    setClients(Array.from(clientsMapRef.current.values()));
    setRequests(Array.from(requestsMapRef.current.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    lastSyncRef.current = snapshot.serverTime;
  };

  const flushWorkerQueue = () => {
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
    setWorkers(Array.from(workersMapRef.current.values()));
  };

  const scheduleWorkerFlush = () => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushWorkerQueue();
      flushTimerRef.current = null;
    }, 200);
  };

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
  }, []);

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

    return () => {
      socket.disconnect();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

  const workersGeo = useMemo<GeoJsonPoint>(() => ({
    type: "FeatureCollection",
    features: workers.map((w) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [w.longitude, w.latitude] as [number, number] },
      properties: { id: w.id, name: `${w.firstName} ${w.lastName}`.trim(), isAvailable: w.isAvailable },
    })),
  }), [workers]);

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

  const onMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const register = (name: string, svg: string) => {
      if (map.hasImage(name)) return;
      map.loadImage(svgToDataUrl(svg), (error, image) => {
        if (error || !image) return;
        map.addImage(name, image, { sdf: false });
      });
    };

    register("worker-helmet", workerHelmetSvg);
    register("worker-helmet-off", workerHelmetOffSvg);
    register("client-dot", clientSvg);
    register("request-pin", requestPinSvg);
  };

  return (
    <section className="relative h-[82vh] overflow-hidden rounded-2xl border border-white/10">
      <div className="absolute left-6 top-6 z-10 w-[320px] rounded-2xl border border-white/10 bg-surface-container-high/70 p-5 backdrop-blur-[24px]">
        <p className="text-sm text-on-surface-variant">Trabajadores activos</p>
        <p className="text-5xl font-bold">{activeWorkers}</p>
        <p className="mt-2 text-xs text-on-surface-variant">Total workers en mapa: {workers.length}</p>
        <p className="text-xs text-on-surface-variant">Clientes en mapa: {clients.length} · Solicitudes: {requests.length}</p>
      </div>

      <div className="absolute right-6 top-6 z-10 w-[390px] rounded-2xl border border-primary/20 bg-surface-container-high/80 p-4 backdrop-blur-[34px]">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <button className={`rounded-full px-3 py-1 ${tab === "requests" ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`} onClick={() => setTab("requests")}>Solicitudes</button>
          <button className={`rounded-full px-3 py-1 ${tab === "workers" ? "bg-primary/20 text-primary" : "text-on-surface-variant"}`} onClick={() => setTab("workers")}>Trabajadores</button>
        </div>

        <div className="max-h-[420px] overflow-auto">
          {tab === "requests" && (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-on-surface-variant">{statusLabel[r.status] ?? r.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{r.clientName} · Bs {r.budget}</p>
                  <p className="truncate text-xs text-on-surface-variant">{r.address}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "workers" && (
            <div className="space-y-2">
              {workers.map((w) => (
                <div key={w.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{w.firstName} {w.lastName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${w.isAvailable ? "bg-primary/20 text-primary" : "bg-gray-400/20 text-gray-300"}`}>{w.isAvailable ? "Activo" : "Inactivo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">Jobs: {w.completedJobs} · Rating: {w.averageRating.toFixed(1)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-full w-full bg-black/20">
        {token ? (
          <Map
            ref={mapRef}
            onLoad={onMapLoad}
            mapboxAccessToken={token}
            initialViewState={{ longitude: -68.15, latitude: -16.5, zoom: 11 }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            reuseMaps
          >
            <Source id="workers" type="geojson" data={workersGeo} cluster clusterRadius={50} clusterMaxZoom={12}>
              <Layer {...workerClusterLayer} />
              <Layer {...workerClusterCountLayer} />
              <Layer {...workerIconLayer} />
            </Source>

            <Source id="clients" type="geojson" data={clientsGeo}>
              <Layer {...clientIconLayer} />
            </Source>

            <Source id="requests" type="geojson" data={requestsGeo} cluster clusterRadius={45} clusterMaxZoom={12}>
              <Layer {...requestClusterLayer} />
              <Layer {...requestClusterCountLayer} />
              <Layer {...requestIconLayer} />
            </Source>
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant">Configura `VITE_MAPBOX_TOKEN` para el mapa realista</div>
        )}
      </div>
    </section>
  );
}
