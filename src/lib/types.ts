export type AdminUser = {
  id: string;
  type: "client" | "worker";
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  verificationStatus?: string;
  isAvailable?: boolean;
  completedJobs?: number;
  averageRating?: number;
  createdAt?: string;
};

export type MapWorker = {
  id: string;
  firstName: string;
  lastName: string;
  isAvailable: boolean;
  averageRating: number;
  completedJobs: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type MapClient = {
  id: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type MapRequest = {
  id: string;
  title: string;
  status: string;
  budget: number;
  address: string;
  clientName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type MapSnapshotResponse = {
  serverTime: string;
  workers: MapWorker[];
  clients: MapClient[];
  requests: MapRequest[];
};

export type WalletWorker = {
  id: string;
  name: string;
  jobsCompleted: number;
  earnings: number;
};

export type WalletResponse = {
  period: "day" | "week" | "month";
  totals: { totalEarnings: number; totalJobs: number };
  workers: WalletWorker[];
};
