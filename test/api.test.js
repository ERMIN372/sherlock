import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Run the app against a throwaway data dir so tests never touch real data.
let server, base, tmp;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'sherlock-test-'));
  // Point the app's data dir at the temp folder so tests never touch real data.
  process.env.SHERLOCK_DATA_DIR = tmp;
  const { createApp } = await import('../server/index.js?test=' + Date.now());
  const app = await createApp();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
  await rm(tmp, { recursive: true, force: true });
});

function randDescriptor(seed = Math.random) {
  return Array.from({ length: 128 }, () => seed() * 2 - 1);
}

const post = (p, body) =>
  fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('rejects opt-in without consent', async () => {
  const r = await post('/api/profiles', { name: 'No Consent', descriptor: randDescriptor() });
  assert.equal(r.status, 400);
});

test('rejects a non-128 descriptor', async () => {
  const r = await post('/api/profiles', { name: 'Bad', descriptor: [1, 2, 3], consent: true });
  assert.equal(r.status, 400);
});

test('full opt-in + search scenario', async () => {
  // A person opts in.
  const baseVec = randDescriptor();
  const add = await post('/api/profiles', {
    name: 'Alex Carter',
    profileUrl: 'https://example.com/alex',
    descriptor: baseVec,
    consent: true,
  });
  assert.equal(add.status, 201);

  // Searching with a near-identical face finds them with a high score.
  const nearVec = baseVec.map((v) => v + (Math.random() - 0.5) * 0.02);
  const sRes = await (await post('/api/search', { descriptor: nearVec })).json();
  assert.ok(sRes.count >= 1, 'expected at least one match');
  const top = sRes.matches[0];
  assert.equal(top.name, 'Alex Carter');
  assert.ok(top.score >= 90, `expected strong score, got ${top.score}`);
  assert.equal(top.descriptor, undefined, 'raw descriptor must not be returned');

  // A clearly different face does not match.
  const farRes = await (await post('/api/search', { descriptor: randDescriptor() })).json();
  const matched = farRes.matches.some((m) => m.name === 'Alex Carter');
  assert.ok(!matched, 'unrelated face should not match');
});

test('search rejects invalid descriptor', async () => {
  const r = await post('/api/search', { descriptor: 'nope' });
  assert.equal(r.status, 400);
});
