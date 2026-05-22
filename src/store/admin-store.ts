import { create } from "zustand";

export type EntityStatus = "active" | "working" | "inactive" | "suspended";

export const useAdminStore = create<{
  search: string;
  setSearch: (v: string) => void;
  selectedWorkerId: string | null;
  setSelectedWorkerId: (v: string | null) => void;
}>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
  selectedWorkerId: null,
  setSelectedWorkerId: (selectedWorkerId) => set({ selectedWorkerId })
}));
