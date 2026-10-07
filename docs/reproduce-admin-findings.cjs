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
  assert.ok(match, 'Review target no longer matches; recheck the finding');
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

// These tests reproduce CURRENT bugs; green means reproduction, not correctness.
test('map rejects completed jobs in the backend history response shape', async () => {
  let displayed;
  const open = action(source('workers-page.tsx'), 'openMapModal', {
    console,
    fetchWorkerHistory: async () => [{ requestId: 'job', requestStatus: 'completed',
      offerStatus: 'accepted', amount: 100, address: 'Test location' }],
    setMapModalWorker: () => {},
    setMapJobs: jobs => { displayed = jobs; },
    setMapViewport: () => {},
  });
  await open({ id: 'worker' });
  assert.equal(displayed.length, 0);
});

test('earnings include a rejected offer on someone else completed job', () => {
  const file = source('workers-page.tsx');
  const reduction = find(file, node => ts.isCallExpression(node)
    && node.expression.getText(file).endsWith('.reduce')
    && node.getText(file).startsWith('workerJobs.filter'));
  const actual = evaluate(reduction.getText(file), {
    workerJobs: [
      { requestStatus: 'completed', offerStatus: 'accepted', amount: 100 },
      { requestStatus: 'completed', offerStatus: 'rejected', amount: 80 },
    ],
  });
  assert.equal(actual, 180);
  assert.notEqual(actual, 100);
});

test('support send failure silently discards the draft', async () => {
  let draft = 'Test support reply';
  let sending;
  const send = action(source('disputes-page.tsx'), 'handleSend', {
    text: draft, sending: false, dispute: { id: 'dispute' },
    setText: text => { draft = text; },
    setSending: value => { sending = value; },
    sendDisputeMessage: async () => { throw new Error('Simulated outage'); },
    loadMessages: async () => { assert.fail('Send failed'); },
  });
  await send();
  assert.equal(draft, '');
  assert.equal(sending, false);
});

test('slow response from job A overwrites job B detail and notified workers', async () => {
  const file = source('requests-page.tsx');
  const effect = find(file, node => ts.isCallExpression(node)
    && node.expression.getText(file) === 'useEffect'
    && node.arguments[0].getText(file).includes('fetchRequestDetail'));
  const detailA = deferred(), detailB = deferred();
  const workersA = deferred(), workersB = deferred();
  let detail, workers;
  function open(id) {
    evaluate(effect.arguments[0].getText(file), {
      selectedRequest: { id },
      setLoadingDetail: () => {}, setModalTab: () => {},
      setRequestDetail: value => { detail = value; },
      setLoadingNotified: () => {}, setNotifiedSearch: () => {},
      setNotifiedWorkers: value => { workers = value; },
      generateTimeline: () => [],
      fetchRequestDetail: () => (id === 'A' ? detailA : detailB).promise,
      fetchRequestNotifiedWorkers: () => (id === 'A' ? workersA : workersB).promise,
    })();
  }
  open('A');
  open('B');
  detailB.resolve({ id: 'B' }); workersB.resolve({ workers: ['B'] });
  await flush();
  assert.equal(detail.id, 'B');
  detailA.resolve({ id: 'A' }); workersA.resolve({ workers: ['A'] });
  await flush();
  assert.equal(detail.id, 'A');
  assert.equal(workers[0], 'A');
});
