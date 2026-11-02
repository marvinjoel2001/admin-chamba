import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Bot,
  CircleHelp,
  MapPin,
  Pause,
  Play,
  Power,
  RefreshCw,
  Save,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  botDraft,
  circlePolygon,
  configureBots,
  controlBots,
  fetchBots,
  runBotScenario,
  updateBot,
  type BotDraft,
  type BotProfile,
  type BotSnapshot,
} from "@/lib/bots-api";

const labels: Record<string, string> = {
  off: "Apagados",
  running: "Encendidos",
  pausing: "Terminando trabajos",
  paused: "En pausa",
  published: "Pedido publicado",
  offered: "Oferta enviada",
  accepted: "Oferta aceptada",
  en_route: "En camino",
  arrived: "Trabajador llegó",
  confirmed: "Llegada confirmada",
  completed: "Terminado",
  cancelled: "Cancelado",
  provision: "Perfiles creados",
  settings: "Configuración guardada",
  profile: "Perfil actualizado",
  start: "Encendido",
  pause: "Pausa",
  stop: "Apagado",
};
const field =
  "w-full rounded-lg border border-slate-300 dark:border-white/15 bg-surface px-3 py-2 text-sm text-on-surface";
const panel =
  "rounded-2xl border border-slate-200 dark:border-white/10 bg-surface-container p-5";
const primary = "bg-purple-600 text-white disabled:opacity-40";
const secondary =
  "border border-slate-300 dark:border-white/15 text-on-surface disabled:opacity-40";
const date = (value: string) =>
  new Date(value).toLocaleString("es-BO", { timeZone: "America/La_Paz" });

function Avatar({
  profile,
  small = false,
}: {
  profile: BotProfile;
  small?: boolean;
}) {
  // Illustrated, fictional profile image; never a photograph of a real person.
  return (
    <svg
      role="img"
      aria-label={`Avatar ilustrado de ${profile.name}`}
      viewBox="0 0 64 64"
      className={
        small ? "h-8 w-8 rounded-full" : "h-12 w-12 shrink-0 rounded-full"
      }
    >
      <rect width="64" height="64" rx="32" fill={profile.avatar_color} />
      <path d="M10 64c0-23 44-23 44 0" fill="#ddd6fe" />
      <ellipse cx="32" cy="28" rx="15" ry="18" fill="#f4ccaa" />
      <path
        d={
          profile.role === "worker"
            ? "M15 24h34v-5H15zm5-5a12 12 0 0 1 24 0"
            : "M17 27V19c0-17 30-17 30 0v7l-7-13-10 9-11-2z"
        }
        fill={profile.role === "worker" ? "#fbbf24" : "#31204a"}
      />
      <circle cx="27" cy="28" r="1.5" fill="#31204a" />
      <circle cx="37" cy="28" r="1.5" fill="#31204a" />
      <path
        d="M27 36q5 4 10 0"
        fill="none"
        stroke="#9d5148"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BotsPage() {
  const [data, setData] = useState<BotSnapshot | null>(null);
  const [draft, setDraft] = useState<BotDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    specialty: "Limpieza",
    enabled: true,
  });
  const [roleFilter, setRoleFilter] = useState("all");
  const map = useRef<MapRef>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  const lastSnapshot = useRef("");
  const mapToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  const accept = useCallback((value: BotSnapshot) => {
    if (!mounted.current || value.serverTime < lastSnapshot.current) return;
    lastSnapshot.current = value.serverTime;
    setData(value);
    setError("");
    if (!dirtyRef.current) setDraft(botDraft(value));
  }, []);
  const reload = useCallback(async () => {
    try {
      accept(await fetchBots());
    } catch {
      if (mounted.current)
        setError("No se pudo actualizar el estado del servidor. Reintenta.");
    }
  }, [accept]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    const timer = setInterval(() => {
      if (!document.hidden) void reload();
    }, 8000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [reload]);

  const change = (patch: Partial<BotDraft>) => {
    dirtyRef.current = true;
    setDirty(true);
    setDraft((old) => (old ? { ...old, ...patch } : old));
  };
  const perform = async (
    work: () => Promise<BotSnapshot>,
    success: string,
    resetDraft = false,
  ) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      const next = await work();
      if (resetDraft) {
        dirtyRef.current = false;
        setDirty(false);
      }
      accept(next);
      toast.success(success);
    } catch (e: unknown) {
      const message = (
        e as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(". ")
          : message || "No se pudo completar la acción.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const zone =
    draft &&
    (draft.centerMode === "manual"
      ? draft
      : data?.latestClient
        ? { ...data.latestClient, radiusKm: draft.radiusKm }
        : null);
  const polygon = useMemo(
    () => (zone ? circlePolygon(zone) : null),
    [zone?.latitude, zone?.longitude, zone?.radiusKm],
  );
  useEffect(() => {
    if (zone)
      map.current?.flyTo({
        center: [zone.longitude, zone.latitude],
        zoom: Math.max(7, 13 - Math.log2(zone.radiusKm)),
        duration: 500,
      });
  }, [zone?.latitude, zone?.longitude, zone?.radiusKm]);

  const profile = data?.profiles.find((p) => p.id === selected);
  const openProfile = (p: BotProfile) => {
    setSelected(p.id);
    setEdit({ name: p.name, specialty: p.specialty, enabled: p.enabled });
  };
  const editable =
    !!data &&
    !["running", "pausing"].includes(data.settings.state) &&
    data.stats.active === 0;

  if (!data || !draft)
    return (
      <div className={panel} role="status">
        {error || "Cargando bots desde la nube…"}
        {error && <Button onClick={reload}>Reintentar</Button>}
      </div>
    );
  const canRun =
    !busy &&
    !dirty &&
    data.settings.zone_configured &&
    !!data.zone &&
    data.profiles.length === 20;
  const shownJobs = profile
    ? data.scenarios.filter(
        (s) => s.client_id === profile.id || s.worker_id === profile.id,
      )
    : data.scenarios;

  return (
    <div className="space-y-6 text-on-surface">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs text-primary">
            <Bot size={14} /> Simulación · solo administración
          </div>
          <h1 className="text-2xl font-semibold">Bots de Chamba</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            20 perfiles en la nube. Los clientes publican y los trabajadores bot
            completan sus trabajos.
          </p>
        </div>
        <Button onClick={reload} disabled={busy} className={secondary}>
          <RefreshCw size={16} className="mr-2 inline" />
          Actualizar
        </Button>
      </div>
      <div className="rounded-xl border border-primary/20 bg-purple-500/10 p-4 text-sm text-on-surface-variant flex gap-3">
        <CircleHelp size={20} className="shrink-0 text-primary" />
        <p>
          Todo aquí es una simulación identificada. No envía avisos a personas
          ni registra pagos, reseñas o trabajos reales. Los perfiles se guardan
          en el backend y funcionan con el admin cerrado.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-red-400">
          {error} Última lectura: {date(data.serverTime)}.
        </p>
      )}
      {data.settings.last_error && (
        <p
          role="alert"
          className="rounded-xl bg-amber-500/10 p-3 text-amber-500"
        >
          {data.settings.last_error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          [
            "Clientes bot",
            data.profiles.filter((p) => p.role === "client").length,
          ],
          [
            "Trabajadores bot",
            data.profiles.filter((p) => p.role === "worker").length,
          ],
          ["En curso", data.stats.active],
          ["Terminados simulados", data.stats.completed],
          [
            "Hoy / límite",
            `${data.stats.today} / ${data.settings.daily_limit}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className={panel}>
            <div className="text-xs text-on-surface-variant">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <section className={panel} aria-label="Control de bots">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{labels[data.settings.state]}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              {data.settings.state === "pausing"
                ? "Terminarán los trabajos en curso antes de quedar en pausa."
                : "Pausar termina los trabajos actuales. Apagar cancela los pendientes."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className={secondary}
              disabled={busy}
              onClick={() =>
                perform(
                  () => controlBots("provision"),
                  "20 perfiles disponibles, sin duplicados",
                )
              }
            >
              Crear / restaurar 20 perfiles
            </Button>
            <Button
              className={secondary}
              disabled={!canRun || data.settings.state === "pausing"}
              onClick={() => {
                const id = crypto.randomUUID();
                void perform(() => runBotScenario(id), "Escenario iniciado");
              }}
            >
              <Play size={14} className="mr-1 inline" />
              Probar 1 trabajo
            </Button>
            <Button
              className={primary}
              disabled={!canRun || data.settings.state === "running"}
              onClick={() =>
                perform(
                  () => controlBots("start"),
                  "Bots encendidos en el backend",
                )
              }
            >
              <Power size={14} className="mr-1 inline" />
              Encender
            </Button>
            <Button
              className={secondary}
              disabled={busy || data.settings.state !== "running"}
              onClick={() =>
                perform(() => controlBots("pause"), "Pausa solicitada")
              }
            >
              <Pause size={14} className="mr-1 inline" />
              Pausar
            </Button>
            <Button
              className="bg-red-500/15 text-red-500 disabled:opacity-40"
              disabled={
                busy ||
                (data.settings.state === "off" && data.stats.active === 0)
              }
              onClick={() =>
                perform(
                  () => controlBots("stop"),
                  "Bots apagados; trabajos pendientes cancelados",
                )
              }
            >
              Apagar
            </Button>
          </div>
        </div>
      </section>
      <section className={panel} aria-label="Zona de funcionamiento">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          <h2 className="font-semibold">
            Una zona circular para todos los bots
          </h2>
          {dirty && (
            <span className="text-xs text-amber-500">Cambios sin guardar</span>
          )}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
              {mapToken ? (
                <Map
                  ref={map}
                  mapboxAccessToken={mapToken}
                  initialViewState={{
                    latitude: zone?.latitude ?? draft.latitude,
                    longitude: zone?.longitude ?? draft.longitude,
                    zoom: Math.max(7, 13 - Math.log2(draft.radiusKm)),
                  }}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  onClick={(event) => {
                    if (editable && draft.centerMode === "manual")
                      change({
                        latitude: event.lngLat.lat,
                        longitude: event.lngLat.lng,
                      });
                  }}
                  cursor={
                    editable && draft.centerMode === "manual"
                      ? "crosshair"
                      : "grab"
                  }
                >
                  <NavigationControl />
                  {polygon && (
                    <Source id="bot-zone" type="geojson" data={polygon}>
                      <Layer
                        id="bot-zone-fill"
                        type="fill"
                        paint={{
                          "fill-color": "#8b5cf6",
                          "fill-opacity": 0.17,
                        }}
                      />
                      <Layer
                        id="bot-zone-line"
                        type="line"
                        paint={{ "line-color": "#a78bfa", "line-width": 2 }}
                      />
                    </Source>
                  )}
                  {zone && (
                    <Marker latitude={zone.latitude} longitude={zone.longitude}>
                      <div
                        title="Centro de la zona"
                        className="h-4 w-4 rounded-full border-2 border-white bg-violet-500"
                      />
                    </Marker>
                  )}
                  {data.profiles
                    .filter((p) => p.latitude !== null && p.longitude !== null)
                    .map((p) => (
                      <Marker
                        key={p.id}
                        latitude={p.latitude!}
                        longitude={p.longitude!}
                      >
                        <button
                          aria-label={`Ver ${p.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openProfile(p);
                          }}
                          className="rounded-full border-2 border-white shadow-lg"
                        >
                          <Avatar profile={p} small />
                        </button>
                      </Marker>
                    ))}
                </Map>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-on-surface-variant">
                  Configura VITE_MAPBOX_TOKEN para ver el mapa. También puedes
                  definir el centro con las coordenadas de la derecha.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              {draft.centerMode === "manual"
                ? "Haz clic en el mapa para mover el centro y ajusta el radio."
                : "El centro se actualiza al recibir una ubicación nueva de un cliente. Los trabajos en curso conservan su zona inicial."}{" "}
              {editable ? "" : "Apaga los bots para editar."}
            </p>
          </div>
          <div className="space-y-4">
            <label className="block text-sm">
              Centro del círculo
              <select
                className={`${field} mt-1`}
                value={draft.centerMode}
                disabled={!editable || busy}
                onChange={(e) =>
                  change({
                    centerMode: e.target.value as BotDraft["centerMode"],
                  })
                }
              >
                <option value="manual">Marcar en el mapa</option>
                <option value="latest_client">
                  Último cliente que actualizó su ubicación
                </option>
              </select>
            </label>
            {draft.centerMode === "latest_client" ? (
              <div className="rounded-lg bg-purple-500/10 p-3 text-xs">
                {data.latestClient ? (
                  <>
                    <strong>{data.latestClient.name}</strong>
                    <br />
                    Última ubicación: {date(data.latestClient.updatedAt)}
                  </>
                ) : (
                  "Todavía no hay actualizaciones de ubicación registradas desde la activación de esta función. Puedes usar una zona manual."
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(["latitude", "longitude"] as const).map((key) => (
                  <label key={key} className="text-xs">
                    {key === "latitude" ? "Latitud" : "Longitud"}
                    <input
                      className={`${field} mt-1`}
                      type="number"
                      step="0.000001"
                      min={key === "latitude" ? -85 : -180}
                      max={key === "latitude" ? 85 : 180}
                      value={draft[key]}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        change({ [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="block text-sm">
              Radio: <strong>{draft.radiusKm.toFixed(2)} km</strong>
              <input
                aria-label="Radio de la zona"
                className="mt-2 w-full accent-violet-500"
                type="range"
                min="0.25"
                max="50"
                step="0.25"
                value={draft.radiusKm}
                disabled={!editable || busy}
                onChange={(e) => change({ radiusKm: Number(e.target.value) })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                Nuevo trabajo cada (min)
                <input
                  className={`${field} mt-1`}
                  type="number"
                  min="1"
                  max="1440"
                  value={draft.intervalSeconds / 60}
                  disabled={!editable || busy}
                  onChange={(e) =>
                    change({
                      intervalSeconds: Math.round(Number(e.target.value) * 60),
                    })
                  }
                />
              </label>
              <label className="text-xs">
                Segundos por paso
                <input
                  className={`${field} mt-1`}
                  type="number"
                  min="5"
                  max="600"
                  value={draft.stepSeconds}
                  disabled={!editable || busy}
                  onChange={(e) =>
                    change({ stepSeconds: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs">
                Trabajos simultáneos
                <input
                  className={`${field} mt-1`}
                  type="number"
                  min="1"
                  max="10"
                  value={draft.maxConcurrent}
                  disabled={!editable || busy}
                  onChange={(e) =>
                    change({ maxConcurrent: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs">
                Límite por día
                <input
                  className={`${field} mt-1`}
                  type="number"
                  min="1"
                  max="500"
                  value={draft.dailyLimit}
                  disabled={!editable || busy}
                  onChange={(e) =>
                    change({ dailyLimit: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <Button
              className={`${primary} w-full`}
              disabled={
                !editable ||
                busy ||
                (draft.centerMode === "latest_client" && !data.latestClient)
              }
              onClick={() =>
                perform(
                  () => configureBots(draft),
                  "Zona y frecuencia guardadas en la nube",
                  true,
                )
              }
            >
              <Save size={16} className="mr-2 inline" />
              Guardar zona y reglas
            </Button>
            <p className="text-xs text-on-surface-variant">
              Límites diarios según Bolivia.{" "}
              {data.settings.zone_configured
                ? "Zona configurada."
                : "Guarda la zona antes de iniciar."}
            </p>
          </div>
        </div>
      </section>
      <section className={panel} aria-label="Perfiles de bots">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users size={20} />
            Perfiles de simulación
          </h2>
          <select
            aria-label="Filtrar perfiles"
            className={field + " max-w-48"}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="client">Clientes</option>
            <option value="worker">Trabajadores</option>
          </select>
        </div>
        {!data.profiles.length && (
          <p className="text-sm text-on-surface-variant">
            Usa “Crear / restaurar 20 perfiles” para crearlos en el backend.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {data.profiles
            .filter((p) => roleFilter === "all" || p.role === roleFilter)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => openProfile(p)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary ${selected === p.id ? "border-primary bg-purple-500/10" : "border-slate-200 dark:border-white/10"}`}
              >
                <Avatar profile={p} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-on-surface-variant">
                    {p.role === "client" ? "Cliente" : p.specialty} · {p.id}
                  </div>
                  <div className="mt-1 text-xs text-primary">
                    {!p.enabled
                      ? "Deshabilitado"
                      : p.current_state
                        ? labels[p.current_state]
                        : "Disponible"}{" "}
                    · {p.completed_count} terminados
                  </div>
                </div>
              </button>
            ))}
        </div>
      </section>
      {profile && (
        <section className={panel} aria-label="Detalle del bot">
          <div className="mb-4 flex justify-between">
            <div className="flex items-center gap-3">
              <Avatar profile={profile} />
              <div>
                <h2 className="font-semibold">{profile.name}</h2>
                <p className="text-xs text-on-surface-variant">
                  {profile.id} · Perfil ficticio · {profile.completed_count}{" "}
                  trabajos simulados terminados
                </p>
              </div>
            </div>
            <button
              aria-label="Cerrar detalle"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
          </div>
          <div className="grid items-end gap-4 md:grid-cols-4">
            <label className="text-xs">
              Nombre
              <input
                className={`${field} mt-1`}
                value={edit.name}
                maxLength={60}
                disabled={!editable || busy}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="text-xs">
              {profile.role === "client"
                ? "Categoría de sus pedidos"
                : "Oficio"}
              <select
                className={`${field} mt-1`}
                value={edit.specialty}
                disabled={!editable || busy}
                onChange={(e) =>
                  setEdit({ ...edit, specialty: e.target.value })
                }
              >
                {["Limpieza", "Plomería", "Electricidad", "Pintura"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label className="flex gap-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={edit.enabled}
                disabled={!editable || busy}
                onChange={(e) =>
                  setEdit({ ...edit, enabled: e.target.checked })
                }
              />
              Bot habilitado
            </label>
            <Button
              className={primary}
              disabled={!editable || busy || edit.name.trim().length < 2}
              onClick={() =>
                perform(() => updateBot(profile.id, edit), "Perfil actualizado")
              }
            >
              Guardar perfil
            </Button>
          </div>
        </section>
      )}
      <section className={panel}>
        <h2 className="mb-4 font-semibold">
          {profile
            ? `Trabajos de ${profile.name}`
            : "Trabajos simulados recientes"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-on-surface-variant">
              <tr>
                {[
                  "Trabajo",
                  "Cliente → trabajador",
                  "Estado",
                  "Zona inicial",
                  "Inicio",
                ].map((h) => (
                  <th key={h} className="pb-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownJobs.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-slate-200 dark:border-white/10"
                >
                  <td className="py-3 pr-4">
                    <div>{s.title}</div>
                    <span className="text-xs text-on-surface-variant">
                      Bs {s.budget} · efectivo simulado · {s.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="pr-4">
                    {s.client_name} → {s.worker_name}
                  </td>
                  <td className="pr-4">{labels[s.state]}</td>
                  <td className="pr-4 text-xs">
                    {s.center_latitude.toFixed(4)},{" "}
                    {s.center_longitude.toFixed(4)} · {s.radius_km} km
                  </td>
                  <td className="text-xs">{date(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shownJobs.length && (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              Aún no hay trabajos simulados{profile ? " para este perfil" : ""}.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          Últimos 100 trabajos del sistema. Las cifras superiores incluyen todo
          el historial.
        </p>
      </section>
      <section className={panel}>
        <h2 className="mb-4 font-semibold">Registro de actividad</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {data.actions
            .filter(
              (a) =>
                !profile ||
                data.scenarios.some(
                  (s) =>
                    s.id === a.scenario_id &&
                    (s.client_id === profile.id || s.worker_id === profile.id),
                ),
            )
            .map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 dark:border-white/10 py-2 text-xs"
              >
                <time className="text-on-surface-variant">
                  {date(a.created_at)}
                </time>
                <strong>{labels[a.kind] || a.kind}</strong>
                <span className="text-on-surface-variant">
                  {a.detail || a.scenario_id?.slice(0, 8)}
                </span>
              </div>
            ))}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          Últimas 100 acciones. Actualización cada 8 segundos mientras este
          panel está visible.
        </p>
      </section>
    </div>
  );
}
