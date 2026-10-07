const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function source(file) {
  const filename = path.join(root, 'src', 'pages', file);
  return ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(file, predicate) {
  let match;
  function visit(node) {
    if (match) return;
    if (predicate(node)) { match = node; return; }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(match, 'Target node not found; recheck search predicate');
  return match;
}
function action(file, name, environment) {
  const node = find(file, node => ts.isVariableDeclaration(node)
    && node.name.getText(file) === name);
  return evaluate(node.initializer.getText(file), environment);
}
function evaluate(expression, environment) {
  const context = vm.createContext(environment);
  const code = ts.transpileModule(`globalThis.result = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInContext(code, context);
  return context.result;
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise(done => setImmediate(done));

test('FIX 1: map accepts completed jobs with requestStatus and coordinates', async () => {
  let displayed;
  let viewport;
  const open = action(source('workers-page.tsx'), 'openMapModal', {
    console,
    fetchWorkerHistory: async () => [{
      requestId: 'job-1',
      requestStatus: 'completed',
      offerStatus: 'accepted',
      amount: 100,
      latitude: -16.5,
      longitude: -68.1,
      address: 'Test location',
    }],
    setMapModalWorker: () => {},
    setMapJobs: jobs => { displayed = jobs; },
    setMapViewport: vp => { viewport = vp; },
  });
  await open({ id: 'worker-1' });
  assert.equal(displayed.length, 1);
  assert.equal(displayed[0].latitude, -16.5);
  assert.equal(displayed[0].longitude, -68.1);
  assert.equal(viewport.latitude, -16.5);
  assert.equal(viewport.longitude, -68.1);
});

test('FIX 2: earnings calculation excludes rejected offers on completed jobs', () => {
  const file = source('workers-page.tsx');
  const reduction = find(file, node => ts.isCallExpression(node)
    && node.expression.getText(file).endsWith('.reduce')
    && node.getText(file).startsWith('workerJobs.filter'));
  const actual = evaluate(reduction.getText(file), {
    workerJobs: [
      { requestStatus: 'completed', offerStatus: 'accepted', amount: 100 },
      { requestStatus: 'completed', offerStatus: 'rejected', amount: 80 },
      { requestStatus: 'completed', offerStatus: 'accepted', amount: 50 },
      { requestStatus: 'cancelled', offerStatus: 'accepted', amount: 200 },
    ],
  });
  assert.equal(actual, 150);
});

test('FIX 3: support send failure preserves the draft', async () => {
  let draft = 'Test support reply';
  let sending;
  let toastError;
  const send = action(source('disputes-page.tsx'), 'handleSend', {
    console,
    text: draft,
    sending: false,
    dispute: { id: 'dispute-1' },
    setText: text => { draft = text; },
    setSending: value => { sending = value; },
    toast: { error: msg => { toastError = msg; }, success: () => {} },
    sendDisputeMessage: async () => { throw new Error('Simulated outage'); },
    loadMessages: async () => { assert.fail('loadMessages should not be called on error'); },
  });
  await send();
  // Draft must be preserved!
  assert.equal(draft, 'Test support reply');
  assert.equal(sending, false);
  assert.ok(toastError, 'Toast error should have been triggered');
});

test('FIX 4: effect cleanup prevents stale job A from overwriting job B', async () => {
  const file = source('requests-page.tsx');
  const effect = find(file, node => ts.isCallExpression(node)
    && node.expression.getText(file) === 'useEffect'
    && node.arguments[0].getText(file).includes('fetchRequestDetail'));
  const detailA = deferred(), detailB = deferred();
  const workersA = deferred(), workersB = deferred();
  let detail, workers;

  function open(id) {
    const cleanup = evaluate(effect.arguments[0].getText(file), {
      selectedRequest: { id },
      setLoadingDetail: () => {}, setModalTab: () => {},
      setRequestDetail: value => { detail = value; },
      setLoadingNotified: () => {}, setNotifiedSearch: () => {},
      setNotifiedWorkers: value => { workers = value; },
      generateTimeline: () => [],
      fetchRequestDetail: () => (id === 'A' ? detailA : detailB).promise,
      fetchRequestNotifiedWorkers: () => (id === 'A' ? workersA : workersB).promise,
    })();
    return cleanup;
  }

  // Open A, then user quickly switches to B
  const cleanupA = open('A');
  if (cleanupA) cleanupA(); // React runs cleanup when selectedRequest changes!

  const cleanupB = open('B');

  // Job B resolves first
  detailB.resolve({ id: 'B' });
  workersB.resolve({ workers: ['B'] });
  await flush();
  assert.equal(detail.id, 'B');
  assert.equal(workers[0], 'B');

  // Job A resolves later (stale response)
  detailA.resolve({ id: 'A' });
  workersA.resolve({ workers: ['A'] });
  await flush();

  // Detail and workers MUST remain B, not overwritten by stale A
  assert.equal(detail.id, 'B');
  assert.equal(workers[0], 'B');
  if (cleanupB) cleanupB();
});
