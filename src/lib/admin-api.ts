import { api } from "@/lib/api";
import type {
  AdminUser,
  MapSnapshotResponse,
  WalletResponse,
  WorkerVerificationReviewPayload,
  WorkerNotificationSettings,
  ApiLogsResponse,
} from "@/lib/types";

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users");
  return data;
}

export async function updateUser(id: string, payload: Partial<AdminUser>) {
  const { data } = await api.patch<AdminUser>(`/users/${id}`, payload);
  return data;
}

export async function fetchWorkerVerificationInbox(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users/verification/workers/inbox");
  return data;
}

export async function reviewWorkerVerification(
  id: string,
  payload: WorkerVerificationReviewPayload,
) {
  const { data } = await api.patch<AdminUser>(`/users/${id}/verification/review`, payload);
  return data;
}

export async function fetchMapSnapshot(since?: string) {
  const { data } = await api.get<MapSnapshotResponse>("/mobile/admin/map-snapshot", {
    params: since ? { since } : undefined,
  });
  return data;
}

export async function fetchWallet(period: "day" | "week" | "month") {
  const { data } = await api.get<WalletResponse>("/mobile/admin/wallet", {
    params: { period },
  });
  return data;
}

export async function fetchWorkerNotificationSettings() {
  const { data } = await api.get<WorkerNotificationSettings>("/mobile/admin/worker-notification-settings");
  return data;
}

export async function updateWorkerNotificationSettings(radiusKm: number) {
  const { data } = await api.post<WorkerNotificationSettings>("/mobile/admin/worker-notification-settings", {
    radiusKm,
  });
  return data;
}

export async function fetchApiLogs(params?: {
  limit?: number;
  offset?: number;
  method?: string;
  statusMin?: number;
  statusMax?: number;
  search?: string;
}) {
  const { data } = await api.get<ApiLogsResponse>("/mobile/admin/logs", {
    params,
  });
  return data;
}
