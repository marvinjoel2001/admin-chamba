export type AdminUser = {
  id: string;
  type: "client" | "worker";
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  verificationStatus?: string;
  idPhotoUrl?: string;
  facePhotoUrl?: string;
  idPhotoVerified?: boolean | null;
  facePhotoVerified?: boolean | null;
  verificationReviewedAt?: string | null;
  isAvailable?: boolean;
  completedJobs?: number;
  averageRating?: number;
  createdAt?: string;
  profilePhotoUrl?: string;
};

export type WorkerVerificationReviewPayload = {
  idPhotoApproved?: boolean;
  facePhotoApproved?: boolean;
};

export type WorkerActiveRequest = {
  id: string;
  title: string;
  status: string;
  address: string;
  workerArrived: boolean;
  clientName: string;
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
  activeRequest: WorkerActiveRequest | null;
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
  clientId?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  createdAt?: string;
  // Worker info
  workerId?: string;
  workerName?: string;
  // Timeline dates
  assignedAt?: string;
  workerArrivedAt?: string;
  clientConfirmedArrivalAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  // Duration in minutes
  durationMinutes?: number;
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

export type WorkerNotificationSettings = {
  radiusKm: number;
};

export type ApiLogItem = {
  id: number;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip?: string | null;
  user_agent?: string | null;
};

// Extended request detail with full timeline
export type RequestDetail = MapRequest & {
  client?: AdminUser;
  worker?: AdminUser;
  offers?: Array<{
    id: string;
    workerId: string;
    workerName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  timeline: Array<{
    stage: string;
    label: string;
    timestamp?: string;
    icon: string;
    completed: boolean;
  }>;
};

// Extended API log item
export type ExtendedApiLogItem = ApiLogItem & {
  query_json?: Record<string, unknown>;
  request_body_json?: Record<string, unknown>;
  response_preview?: string | null;
  error_message?: string | null;
  created_at: string;
};

export type ApiLogsResponse = {
  total: number;
  items: ApiLogItem[];
  metrics15m: {
    total: number;
    total4xx: number;
    total5xx: number;
    avgMs: number;
  };
  paging: {
    limit: number;
    offset: number;
  };
};

// ─── Disputes ───

export type Dispute = {
  id: string;
  requestId: string;
  requestTitle: string;
  requestStatus: string;
  reportedBy: string;
  reporterName: string;
  reporterType: string;
  reportedUser: string | null;
  reportedName: string;
  reportedType: string | null;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DisputeMessage = {
  id: string;
  disputeId: string;
  senderType: string;
  senderId: string | null;
  senderName: string;
  content: string;
  createdAt: string;
};

// ─── Categories ───

export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  parentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
