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
  NotifiedWorkersResponse,
  ApiLogsResponse,
  RequestDetail,
  PaymentMethod,
  PaymentMethodConfig,
  PaymentProviderOption,
  PaymentRecord,
  AiConfig,
  WorkerLead,
  StripeConfig,
  WebContactMessage,
} from "@/lib/types";

export async function fetchWorkerLeads(): Promise<WorkerLead[]> {
  const { data } = await api.get<WorkerLead[]>("/worker-leads");
  return data;
}

export async function markWorkerLeadContacted(id: string): Promise<WorkerLead> {
  const { data } = await api.patch<WorkerLead>(`/worker-leads/${id}/contacted`);
  return data;
}

/**
 * Alta de un trabajador desde el admin: crea la cuenta y le pone contraseña
 * (se guarda hasheada) para que entre a la app con su correo.
 */
export async function createWorker(payload: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AdminUser> {
  const { password, ...fields } = payload;
  const { data } = await api.post<AdminUser>("/users", { ...fields, type: "worker" });
  return updateUser(data.id, { password });
}

// --- Bandeja web (landing) ---

export async function fetchWebContact(kind: "report" | "subscribe") {
  const { data } = await api.get<WebContactMessage[]>("/mobile/admin/web-contact", { params: { kind } });
  return data;
}

export async function markWebContactHandled(id: string) {
  const { data } = await api.post<{ id: string; handledAt: string }>(`/mobile/admin/web-contact/${id}/handled`);
  return data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users");
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<AdminUser> & { password?: string },
) {
  try {
    const { data } = await api.patch<AdminUser>(`/users/${id}`, payload);
    return data;
  } catch (patchError) {
    console.warn("PATCH updateUser falló, reintentando con POST...", patchError);
    const { data } = await api.post<AdminUser>(`/users/${id}`, payload);
    return data;
  }
}

export async function fetchWorkerVerificationInbox(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users/verification/workers/inbox");
  return data;
}

export async function reviewWorkerVerification(
  id: string,
  payload: WorkerVerificationReviewPayload,
) {
  try {
    const { data } = await api.patch<AdminUser>(`/users/${id}/verification/review`, payload);
    return data;
  } catch (patchError) {
    console.warn("PATCH reviewWorkerVerification falló, reintentando con POST...", patchError);
    const { data } = await api.post<AdminUser>(`/users/${id}/verification/review`, payload);
    return data;
  }
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

export async function fetchOfferLifetimeSettings() {
  const { data } = await api.get<{ fixed: number; hour: number; day: number }>("/mobile/admin/offer-lifetime-settings");
  return data;
}

export async function updateOfferLifetimeSettings(payload: { fixed: number; hour: number; day: number }) {
  const { data } = await api.post<{ fixed: number; hour: number; day: number }>("/mobile/admin/offer-lifetime-settings", payload);
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

export async function clearApiLogs() {
  await api.delete("/mobile/admin/logs/clear");
}

// --- Disputes ---

export async function fetchUserDisputes(userId: string) {
  const { data } = await api.get<{ made: Dispute[]; received: Dispute[] }>(`/mobile/admin/users/${userId}/disputes`);
  return data;
}

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

// --- Worker History ---

export async function fetchWorkerHistory(workerUserId: string) {
  const { data } = await api.get<{ workerUserId: string; jobs: any[] }>("/mobile/worker/history", {
    params: { workerUserId },
  });
  return data.jobs;
}

export async function fetchWorkerReviews(workerUserId: string) {
  const { data } = await api.get(`/mobile/workers/${workerUserId}/profile`);
  return data.reviews || [];
}

// --- Request Detail ---

export async function fetchRequestDetail(requestId: string): Promise<RequestDetail> {
  const { data } = await api.get<RequestDetail>(`/mobile/admin/requests/${requestId}`);
  return data;
}

export async function fetchRequestNotifiedWorkers(requestId: string): Promise<NotifiedWorkersResponse> {
  const { data } = await api.get<NotifiedWorkersResponse>(`/mobile/admin/requests/${requestId}/notified-workers`);
  return data;
}

// --- Payment Methods ---

export async function fetchPaymentMethods(includeInactive = false) {
  const { data } = await api.get<PaymentMethod[]>("/payment-methods", {
    params: { includeInactive: includeInactive ? "true" : "false" },
  });
  return data;
}

export async function createPaymentMethod(payload: {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
  config?: PaymentMethodConfig;
}) {
  const { data } = await api.post<PaymentMethod>("/payment-methods", payload);
  return data;
}

export async function updatePaymentMethod(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    isActive: boolean;
    sortOrder: number;
    config: PaymentMethodConfig;
  }>
) {
  const { data } = await api.put<PaymentMethod>(`/payment-methods/${id}`, payload);
  return data;
}

export async function deletePaymentMethod(id: string) {
  await api.delete(`/payment-methods/${id}`);
}

export async function seedPaymentMethods() {
  const { data } = await api.post<{ message: string }>("/payment-methods/seed");
  return data;
}

// --- Pagos dentro de la app ---

export async function fetchPaymentProviders() {
  const { data } = await api.get<PaymentProviderOption[]>("/mobile/admin/payments/providers");
  return data;
}

export async function uploadPaymentQr(imageBase64: string) {
  const { data } = await api.post<{ url: string }>("/mobile/admin/payments/qr-image", { imageBase64 });
  return data.url;
}

export async function fetchPayments(status?: string) {
  const { data } = await api.get<PaymentRecord[]>("/mobile/admin/payments", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function confirmPayment(id: string) {
  await api.post(`/mobile/admin/payments/${id}/confirm`);
}

export async function rejectPayment(id: string, reason?: string) {
  await api.post(`/mobile/admin/payments/${id}/reject`, { reason });
}

// --- Notifications ---

export async function broadcastNotification(payload: {
  target: 'all' | 'workers' | 'clients' | 'custom';
  /** `announcement`: aviso que queda en la bandeja de la app y llega por push. */
  type: 'push' | 'toast' | 'announcement';
  title: string;
  body: string;
  toastType?: 'info' | 'success' | 'error';
  userIds?: string[];
  isCallAlert?: boolean;
}) {
  const { data } = await api.post<{ success: boolean; method: string; count?: number; saved?: number }>(
    "/mobile/admin/notifications/broadcast",
    payload,
  );
  return data;
}

export async function simulateJobRequestNotification(payload: {
  target: 'all' | 'workers' | 'custom';
  userIds?: string[];
}) {
  const { data } = await api.post("/mobile/admin/notifications/simulate-request", payload);
  return data;
}

export async function fetchPushUsers() {
  const { data } = await api.get<{id: string, firstName: string, lastName: string, type: string, lastSeenAt: string}[]>("/mobile/admin/push-users");
  return data;
}

// --- AI Config ---

export async function fetchAiConfig(): Promise<AiConfig> {
  const { data } = await api.get<AiConfig>("/mobile/admin/ai-config");
  return data;
}

export async function updateAiConfig(payload: AiConfig): Promise<AiConfig> {
  const { data } = await api.post<AiConfig>("/mobile/admin/ai-config", payload);
  return data;
}

// --- Stripe Config ---

export async function fetchStripeConfig(): Promise<StripeConfig> {
  const { data } = await api.get<StripeConfig>("/mobile/admin/stripe-config");
  return data;
}

export async function updateStripeConfig(payload: StripeConfig): Promise<StripeConfig> {
  const { data } = await api.post<StripeConfig>("/mobile/admin/stripe-config", payload);
  return data;
}

// ── Agencias (B2B) ─────────────────────────────────────────────

export async function fetchAgencies() {
  const { data } = await api.get<import("@/lib/types").AdminAgency[]>("/admin/agencies");
  return data;
}

export async function createAgency(payload: {
  name: string;
  contactEmail: string;
  password: string;
  contactPhone?: string;
  taxId?: string;
  commissionRate?: number;
}) {
  const { data } = await api.post<import("@/lib/types").AdminAgency>("/admin/agencies", payload);
  return data;
}

export async function updateAgency(
  id: string,
  payload: Partial<{
    name: string;
    contactEmail: string;
    contactPhone: string;
    taxId: string;
    commissionRate: number;
    isActive: boolean;
    password: string;
  }>,
) {
  const { data } = await api.patch<import("@/lib/types").AdminAgency>(`/admin/agencies/${id}`, payload);
  return data;
}

export async function deleteAgency(id: string) {
  await api.delete(`/admin/agencies/${id}`);
}

// Cuenta de una agencia con Chamba (pagos digitales, comisiones, liquidaciones)
export type AgencyAccount = {
  summary: {
    balance: number;
    digitalJobs: number;
    digitalCollected: number;
    digitalFees: number;
    cashJobs: number;
    cashFees: number;
    paidToAgency: number;
    paidToChamba: number;
  };
  settlements: Array<{
    id: string;
    direction: "to_agency" | "to_chamba";
    amount: number;
    note: string | null;
    createdAt: string;
  }>;
};

export async function fetchAgencyAccount(agencyId: string) {
  const { data } = await api.get<AgencyAccount>(`/admin/agencies/${agencyId}/account`);
  return data;
}

export async function createAgencySettlement(
  agencyId: string,
  payload: { direction: "to_agency" | "to_chamba"; amount: number; note?: string },
) {
  const { data } = await api.post<AgencyAccount>(`/admin/agencies/${agencyId}/settlements`, payload);
  return data;
}
