import { api } from "./api";

export type BotZone = { latitude: number; longitude: number; radiusKm: number };
export type BotDraft = BotZone & {
  centerMode: "manual" | "latest_client";
  intervalSeconds: number;
  stepSeconds: number;
  maxConcurrent: number;
  dailyLimit: number;
};
export type BotProfile = {
  id: string;
  role: "client" | "worker";
  name: string;
  avatar_color: string;
  specialty: string;
  enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  active_scenario_id: string | null;
  current_state: string | null;
  completed_count: number;
};
export type BotScenario = {
  id: string;
  client_id: string;
  worker_id: string;
  client_name: string;
  worker_name: string;
  category: string;
  title: string;
  budget: number;
  state: string;
  latitude: number;
  longitude: number;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  created_at: string;
  finished_at: string | null;
};
export type BotSnapshot = {
  simulation: true;
  settings: {
    state: "off" | "running" | "pausing" | "paused";
    zone_configured: boolean;
    center_mode: "manual" | "latest_client";
    latitude: number;
    longitude: number;
    radius_km: number;
    interval_seconds: number;
    step_seconds: number;
    max_concurrent: number;
    daily_limit: number;
    last_error: string | null;
    next_start_at: string | null;
  };
  latestClient: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null;
  zone: BotZone | null;
  profiles: BotProfile[];
  scenarios: BotScenario[];
  stats: {
    active: number;
    completed: number;
    cancelled: number;
    today: number;
  };
  actions: {
    id: string;
    scenario_id: string | null;
    kind: string;
    detail: string | null;
    created_at: string;
  }[];
  serverTime: string;
};

export const fetchBots = async () =>
  (await api.get<BotSnapshot>("/admin/bots")).data;
export const configureBots = async (draft: BotDraft) =>
  (await api.patch<BotSnapshot>("/admin/bots/settings", draft)).data;
export const controlBots = async (
  command: "provision" | "start" | "pause" | "stop",
) => (await api.post<BotSnapshot>(`/admin/bots/${command}`)).data;
export const runBotScenario = async (requestId: string) =>
  (await api.post<BotSnapshot>("/admin/bots/run-once", { requestId })).data;
export const updateBot = async (
  id: string,
  patch: { name: string; specialty: string; enabled: boolean },
) =>
  (
    await api.patch<BotSnapshot>(
      `/admin/bots/profiles/${encodeURIComponent(id)}`,
      patch,
    )
  ).data;

export function botDraft(data: BotSnapshot): BotDraft {
  const s = data.settings;
  return {
    centerMode: s.center_mode,
    latitude: s.latitude,
    longitude: s.longitude,
    radiusKm: s.radius_km,
    intervalSeconds: s.interval_seconds,
    stepSeconds: s.step_seconds,
    maxConcurrent: s.max_concurrent,
    dailyLimit: s.daily_limit,
  };
}

export function circlePolygon(zone: BotZone) {
  const rad = Math.PI / 180,
    lat = zone.latitude * rad,
    lng = zone.longitude * rad,
    distance = zone.radiusKm / 6371;
  const ring: [number, number][] = [];
  for (let i = 0; i <= 96; i++) {
    const bearing = (i * 2 * Math.PI) / 96;
    const pLat = Math.asin(
      Math.sin(lat) * Math.cos(distance) +
        Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
    );
    const pLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
        Math.cos(distance) - Math.sin(lat) * Math.sin(pLat),
      );
    ring.push([pLng / rad, pLat / rad]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}
