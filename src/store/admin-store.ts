import { create } from "zustand";

export type EntityStatus = "active" | "working" | "inactive" | "suspended";

interface BadgeCounts {
  pendingDisputes: number;
  pendingVerifications: number;
  pendingLeads: number;
}

interface AdminStore extends BadgeCounts {
  search: string;
  setSearch: (v: string) => void;
  // Badge counts
  setPendingDisputes: (count: number) => void;
  setPendingVerifications: (count: number) => void;
  setPendingLeads: (count: number) => void;
  incrementPendingDisputes: () => void;
  decrementPendingDisputes: () => void;
  incrementPendingVerifications: () => void;
  decrementPendingVerifications: () => void;
  incrementPendingLeads: () => void;
  decrementPendingLeads: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
  // Badge counts initial state
  pendingDisputes: 0,
  pendingVerifications: 0,
  pendingLeads: 0,
  // Badge count setters
  setPendingDisputes: (count) => set({ pendingDisputes: count }),
  setPendingVerifications: (count) => set({ pendingVerifications: count }),
  setPendingLeads: (count) => set({ pendingLeads: count }),
  incrementPendingDisputes: () => set((state) => ({ pendingDisputes: state.pendingDisputes + 1 })),
  decrementPendingDisputes: () => set((state) => ({ pendingDisputes: Math.max(0, state.pendingDisputes - 1) })),
  incrementPendingVerifications: () => set((state) => ({ pendingVerifications: state.pendingVerifications + 1 })),
  decrementPendingVerifications: () => set((state) => ({ pendingVerifications: Math.max(0, state.pendingVerifications - 1) })),
  incrementPendingLeads: () => set((state) => ({ pendingLeads: state.pendingLeads + 1 })),
  decrementPendingLeads: () => set((state) => ({ pendingLeads: Math.max(0, state.pendingLeads - 1) })),
}));
