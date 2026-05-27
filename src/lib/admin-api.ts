import { api } from "@/lib/api";
import type {
  AdminUser,
  Category,
  Dispute,
  DisputeMessage,
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

// --- Disputes ---

export async function fetchDisputes(status?: string) {
  const { data } = await api.get<{ disputes: Dispute[] }>("/mobile/admin/disputes", {
    params: status ? { status } : undefined,
  });
  return data.disputes;
}

export async function resolveDispute(disputeId: string, resolution: string) {
  const { data } = await api.post(`/mobile/admin/disputes/${disputeId}/resolve`, { resolution, resolvedBy: "admin" });
  return data;
}

export async function fetchDisputeMessages(disputeId: string) {
  const { data } = await api.get<{ messages: DisputeMessage[] }>(`/mobile/disputes/${disputeId}/messages`);
  return data.messages;
}

export async function sendDisputeMessage(disputeId: string, content: string) {
  const { data } = await api.post(`/mobile/disputes/${disputeId}/messages`, {
    senderType: "admin",
    content,
  });
  return data;
}

// --- Categories ---

export async function fetchCategories() {
  const { data } = await api.get<{ categories: Category[] }>("/mobile/admin/categories");
  return data.categories;
}

export async function createCategory(payload: { name: string; description?: string; icon?: string }) {
  const { data } = await api.post<{ category: Category }>("/mobile/categories", payload);
  return data.category;
}

export async function updateCategory(id: string, payload: Partial<{ name: string; description: string; icon: string; active: boolean }>) {
  const { data } = await api.patch<{ category: Category }>(`/mobile/admin/categories/${id}`, payload);
  return data.category;
}

export async function deleteCategory(id: string) {
  await api.delete(`/mobile/admin/categories/${id}`);
}

// --- Commission ---

export async function fetchCommission() {
  const { data } = await api.get<{ commissionPercent: number }>("/mobile/admin/commission");
  return data.commissionPercent;
}

export async function updateCommission(commissionPercent: number) {
  const { data } = await api.post<{ commissionPercent: number }>("/mobile/admin/commission", { commissionPercent });
  return data.commissionPercent;
}

// --- Admin Cancel ---

export async function adminCancelRequest(requestId: string) {
  const { data } = await api.post(`/mobile/admin/requests/${requestId}/cancel`);
  return data;
}