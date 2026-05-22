export const workers = [
  { id: "W-8492", name: "Marcus Johnson", specialty: "Master Plumber", status: "active", jobs: 342, rating: 4.9 },
  { id: "W-9103", name: "Sarah Chen", specialty: "Electrician", status: "working", jobs: 189, rating: 4.8 },
  { id: "W-7721", name: "David Rodriguez", specialty: "HVAC Tech", status: "suspended", jobs: 845, rating: 4.3 }
];

export const clients = [
  { id: "C-01", name: "Acme Corp", email: "contact@acmecorp.com", requests: 1245, status: "active" },
  { id: "C-02", name: "Nexus Dynamics", email: "hello@nexus.io", requests: 892, status: "active" },
  { id: "C-03", name: "Omni Systems", email: "admin@omni.sys", requests: 12, status: "inactive" }
];

export const requests = [
  { id: "REQ-8924", title: "Commercial Wiring Repair", worker: "Sarah Chen", client: "Acme Corp", status: "working", budget: 450 },
  { id: "REQ-8910", title: "Leak Detection", worker: "Marcus Johnson", client: "Nexus Dynamics", status: "active", budget: 220 }
];

export const revenueTrend = [
  { name: "Mon", revenue: 12000 }, { name: "Tue", revenue: 18400 }, { name: "Wed", revenue: 16200 },
  { name: "Thu", revenue: 22100 }, { name: "Fri", revenue: 24900 }, { name: "Sat", revenue: 19800 }, { name: "Sun", revenue: 17300 }
];

export const jobsByCategory = [
  { name: "Plumbing", value: 40 }, { name: "Electrical", value: 24 }, { name: "HVAC", value: 16 }, { name: "Other", value: 20 }
];
