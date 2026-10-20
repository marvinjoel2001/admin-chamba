const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

// Render the real page components and run their hooks. Only network, Mapbox's
// WebGL renderer and visual wrappers are replaced; tests never contact production.
const passThrough = ({ children }) => React.createElement(React.Fragment, null, children);
const MockMap = React.forwardRef(({ children, ...props }, ref) => {
  React.useImperativeHandle(ref, () => ({ getMap: () => ({ flyTo() {} }) }));
  return React.createElement("map-view", props, children);
});
const mapModule = {
  __esModule: true,
  default: MockMap,
  Source: ({ children, ...props }) => React.createElement("map-source", props, children),
  Layer: () => null,
  Popup: passThrough,
  Marker: passThrough,
};
const tableModule = {
  DataTable: (props) => React.createElement("data-table", props),
};

function loadPage(file, mocks = {}) {
  const filename = path.join(__dirname, "..", "src", "pages", file);
  const source = readFileSync(filename, "utf8").replaceAll("import.meta.env", "__testEnv");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const exports = {};
  const defaults = {
    "react-map-gl": mapModule,
    "@/components/ui/data-table": tableModule,
    "@/components/ui/button": {
      Button: ({ children, ...props }) => React.createElement("button", props, children),
    },
    "@/components/ui/modal": {
      Modal: passThrough, ModalClose: passThrough, ModalContent: passThrough, ModalTrigger: passThrough,
    },
    "@/components/ui/user-avatar": { UserAvatar: () => null },
    "@/components/user-reports-modal": { UserReportsModal: () => null },
    sonner: { toast: { error() {}, warning() {}, success() {}, info() {} } },
    ...mocks,
  };
  vm.runInNewContext(outputText, {
    exports,
    require: (id) => {
      if (id.endsWith(".css")) return {};
      if (Object.hasOwn(defaults, id)) return defaults[id];
      return require(id);
    },
    __testEnv: { VITE_MAPBOX_TOKEN: "test-no-network" },
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: clearTimeout,
  }, { filename });
  return exports;
}

async function render(t, Component, props = {}) {
  let tree;
  await act(async () => { tree = create(React.createElement(Component, props)); });
  t.after(() => act(() => tree.unmount()));
  return tree;
}

const sourceData = (tree, id) => tree.root.findAllByType("map-source").find((s) => s.props.id === id).props.data;
const tableData = (tree) => tree.root.findByType("data-table").props.data;
const now = () => new Date().toISOString();
const worker = () => ({
  id: "worker-qa", firstName: "Worker", lastName: "QA", isAvailable: true,
  averageRating: 4.5, completedJobs: 2, latitude: -17.8, longitude: -63.18,
  updatedAt: now(), activeRequest: null,
});
const request = (id = "request-qa") => ({
  id, title: "Pintura QA", status: "searching", budget: 100.5, address: "Zona QA",
  clientName: "Cliente QA", latitude: -17.8, longitude: -63.18, updatedAt: now(), createdAt: now(),
});

function mapFixture(socket = new EventEmitter()) {
  let disconnected = 0;
  socket.disconnect = () => disconnected++;
  const snapshot = {
    workers: [worker()],
    clients: [{ id: "client-qa", firstName: "Cliente", lastName: "QA", latitude: -17.8, longitude: -63.18, updatedAt: now() }],
    requests: [request()], serverTime: now(),
  };
  const { default: Page } = loadPage("map-page.tsx", {
    "@/lib/admin-api": {
      fetchWorkerNotificationSettings: async () => ({ radiusKm: 5 }),
      fetchMapSnapshot: async () => snapshot,
    },
    "@/lib/websocket-service": { websocketService: { getSocket: () => socket } },
  });
  return { Page, socket, disconnected: () => disconnected };
}

test("map mounts, subscribes once and keeps the shared socket on unmount/remount", async (t) => {
  const { Page, socket, disconnected } = mapFixture();
  const foreignListener = () => {};
  socket.on("worker.location.updated", foreignListener);
  const tree = await render(t, Page);
  assert.equal(sourceData(tree, "workers").features.length, 1);
  assert.equal(sourceData(tree, "clients").features.length, 1);
  assert.equal(sourceData(tree, "requests").features.length, 1);
  assert.equal(socket.listenerCount("worker.location.updated"), 2);
  assert.equal(socket.listenerCount("request.published"), 1);
  await act(async () => tree.unmount());
  assert.equal(disconnected(), 0);
  assert.equal(socket.listenerCount("worker.location.updated"), 1);
  assert.equal(socket.listenerCount("request.published"), 0);
  assert.equal(socket.listenerCount("client.location.updated"), 0);
  await render(t, Page);
  assert.equal(socket.listenerCount("worker.location.updated"), 2);
  assert.equal(socket.listenerCount("request.published"), 1);
});

test("map receives worker/client positions and publishes/statuses of requests", async (t) => {
  const { Page, socket } = mapFixture();
  const tree = await render(t, Page);
  await act(async () => {
    socket.emit("worker.location.updated", { workerId: "worker-qa", latitude: -17.81, longitude: -63.19, timestamp: now() });
    socket.emit("worker.location.updated", { workerId: "worker-qa", latitude: -17.82, longitude: -63.20, timestamp: now() });
    socket.emit("client.location.updated", { clientId: "client-qa", latitude: -17.83, longitude: -63.21, timestamp: now() });
    socket.emit("request.published", { ...request("new-qa"), requestId: "new-qa", timestamp: now() });
    socket.emit("request.status.updated", { requestId: "new-qa", status: "in_progress", timestamp: now() });
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  assert.equal(JSON.stringify(sourceData(tree, "workers").features[0].geometry.coordinates), "[-63.2,-17.82]");
  assert.equal(JSON.stringify(sourceData(tree, "clients").features[0].geometry.coordinates), "[-63.21,-17.83]");
  assert.equal(sourceData(tree, "requests").features.find((r) => r.properties.id === "new-qa").properties.status, "in_progress");
});

test("map still renders its snapshot if the shared socket is unavailable", async (t) => {
  const { default: Page } = loadPage("map-page.tsx", {
    "@/lib/admin-api": {
      fetchMapSnapshot: async () => ({ workers: [], clients: [], requests: [request()], serverTime: now() }),
      fetchWorkerNotificationSettings: async () => ({ radiusKm: 5 }),
    },
    "@/lib/websocket-service": { websocketService: { getSocket: () => null } },
  });
  const tree = await render(t, Page);
  assert.equal(sourceData(tree, "requests").features.length, 1);
});

function fillWorkerForm(tree, email = "persona+qa@example.com") {
  act(() => tree.root.findAllByType("input")[0].props.onChange({ target: { value: "  Persona QA  " } }));
  act(() => tree.root.findAllByType("input")[2].props.onChange({ target: { value: email } }));
  act(() => tree.root.findAllByType("input")[4].props.onChange({ target: { value: "test-only-123" } }));
}

test("create worker accepts normal emails and rejects malformed ones", async (t) => {
  const { CreateWorkerForm } = loadPage("workers-page.tsx", { "@/lib/admin-api": {} });
  const tree = await render(t, CreateWorkerForm, { onCreated() {} });
  const submit = () => tree.root.findAllByType("button").find((b) => b.props.type === "submit");
  assert.equal(submit().props.disabled, true);
  for (const email of ["persona@example.com", "nombre.apellido+qa@sub.example.com", "  persona@example.com  "]) {
    fillWorkerForm(tree, email);
    assert.equal(submit().props.disabled, false, email);
  }
  for (const email of ["persona", "persona@", "persona@dominio", "persona@@dominio.com", "persona con espacio@dominio.com"]) {
    fillWorkerForm(tree, email);
    assert.equal(submit().props.disabled, true, email);
  }
});

test("create worker submits trimmed fields once while saving", async (t) => {
  const calls = [];
  let complete;
  let created;
  const pending = new Promise((resolve) => { complete = resolve; });
  const { CreateWorkerForm } = loadPage("workers-page.tsx", {
    "@/lib/admin-api": { createWorker: (data) => { calls.push(data); return pending; } },
  });
  const tree = await render(t, CreateWorkerForm, { onCreated: (data) => { created = data; } });
  fillWorkerForm(tree, " persona@example.com ");
  let submission;
  act(() => { submission = tree.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
  await act(async () => { await tree.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].firstName, "Persona QA");
  assert.equal(calls[0].email, "persona@example.com");
  await act(async () => { complete({ id: "created-qa" }); await submission; });
  assert.equal(created.id, "created-qa");
});

test("wallet shows cents, commission and the direction of balances", async (t) => {
  const workers = [
    { id: "a", name: "QA A", earnings: 200.5, jobsCompleted: 2, platformFees: 20.05, balance: 30.25 },
    { id: "b", name: "QA B", earnings: 100, jobsCompleted: 1, platformFees: 10, balance: -10 },
  ];
  const { default: Page } = loadPage("wallet-page.tsx", {
    "@/lib/admin-api": { fetchWallet: async () => ({ workers, totals: { totalEarnings: 300.5, totalJobs: 3, totalCommission: 30.05 }, commissionPercent: 10 }) },
  });
  const tree = await render(t, Page);
  assert.ok(tree.root.findAllByType("p").some((node) => node.children.join("") === "Bs 30.05"));
  const columns = tree.root.findByType("data-table").props.columns;
  const balance = columns.find((c) => c.accessorKey === "balance");
  assert.equal(balance.cell({ row: { original: workers[0] } }), "Chamba le debe Bs 30.25");
  assert.equal(balance.cell({ row: { original: workers[1] } }), "Debe a Chamba Bs 10.00");
});

test("web inbox refreshes matching events, changes tabs and cleans up its listener", async (t) => {
  const socket = new EventEmitter();
  const calls = [];
  const { default: Page } = loadPage("web-contact-page.tsx", {
    "@/lib/admin-api": { fetchWebContact: async (kind) => { calls.push(kind); return [{ id: kind }]; } },
    "@/lib/websocket-service": { websocketService: { getSocket: () => socket } },
  });
  const tree = await render(t, Page);
  assert.equal(tableData(tree)[0].id, "report");
  await act(async () => socket.emit("web_contact.new", { kind: "subscribe" }));
  assert.equal(calls.length, 1);
  await act(async () => socket.emit("web_contact.new", { kind: "report" }));
  assert.equal(calls.length, 2);
  await act(async () => tree.root.findAllByType("button").find((b) => b.children.includes("Suscriptores")).props.onClick());
  assert.equal(tableData(tree)[0].id, "subscribe");
  assert.equal(socket.listenerCount("web_contact.new"), 1);
  act(() => tree.unmount());
  assert.equal(socket.listenerCount("web_contact.new"), 0);
});

test("requests apply the header search and react to later search changes", async (t) => {
  let search = "Pintura";
  const { default: Page } = loadPage("requests-page.tsx", {
    "@/lib/admin-api": { fetchMapSnapshot: async () => ({ requests: [request("paint"), { ...request("clean"), title: "Limpieza QA" }] }) },
    "@/store/admin-store": { useAdminStore: (selector) => selector({ search }) },
  });
  const tree = await render(t, Page);
  assert.equal(tableData(tree).length, 1);
  assert.equal(tableData(tree)[0].id, "paint");
  search = "Limpieza";
  await act(async () => tree.update(React.createElement(Page)));
  assert.equal(tableData(tree).length, 1);
  assert.equal(tableData(tree)[0].id, "clean");
});
