import { api } from "@/lib/api";
import type { AdminUser, MapSnapshotResponse, WalletResponse } from "@/lib/types";

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users");
  return data;
}

export async function updateUser(id: string, payload: Partial<AdminUser>) {
  const { data } = await api.patch<AdminUser>(`/users/${id}`, payload);
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
