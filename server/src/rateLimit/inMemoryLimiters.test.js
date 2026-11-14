import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemorySlidingWindow, InMemoryTokenBucket } from './inMemoryLimiters.js';

const clock = (start = 1_000_000) => {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
};

describe('InMemorySlidingWindow', () => {
  it('allows up to the limit in a window, reports remaining, then rejects with a retry time', async () => {
    const now = clock();
    const w = new InMemorySlidingWindow({ limit: 3, windowMs: 10_000, now });
    const results = [];
    for (let i = 0; i < 4; i += 1) { results.push(await w.consume('k')); now.advance(1000); }
    assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
    assert.deepEqual(results.map((r) => r.remaining), [2, 1, 0, 0]);
    // oldest allowed request was 3s ago, so a slot opens in 7s
    assert.equal(results[3].retryAfterMs, 7000);
    assert.equal(results[0].limit, 3);
  });

  it('is a true sliding window: no double allowance across a boundary', async () => {
    const now = clock();
    const w = new InMemorySlidingWindow({ limit: 2, windowMs: 10_000, now });
    now.advance(9000);
    assert.equal((await w.consume('k')).allowed, true);
    assert.equal((await w.consume('k')).allowed, true);
    now.advance(2000); // a fixed window would have reset here, but both requests are only 2s old
    assert.equal((await w.consume('k')).allowed, false);
    now.advance(8001);
    assert.equal((await w.consume('k')).allowed, true);
  });

  it('keeps keys independent', async () => {
    const w = new InMemorySlidingWindow({ limit: 1, windowMs: 1000, now: clock() });
    assert.equal((await w.consume('a')).allowed, true);
    assert.equal((await w.consume('a')).allowed, false);
    assert.equal((await w.consume('b')).allowed, true);
  });

  it('prune forgets idle keys but keeps active ones', async () => {
    const now = clock();
    const w = new InMemorySlidingWindow({ limit: 5, windowMs: 1000, now });
    await w.consume('old');
    now.advance(1500);
    await w.consume('fresh');
    w.prune();
    assert.deepEqual([...w.logs.keys()], ['fresh']);
  });

  it('prunes automatically as it is used, so many one-off clients do not grow memory forever', async () => {
    const now = clock();
    const w = new InMemorySlidingWindow({ limit: 1, windowMs: 1000, now });
    for (let i = 0; i < 999; i += 1) await w.consume(`ip${i}`);
    now.advance(5000);
    await w.consume('the-1000th'); // triggers the sweep
    assert.equal(w.logs.size, 1);
  });
});

describe('InMemoryTokenBucket', () => {
  it('allows a burst up to capacity, then rejects with a retry time', async () => {
    const now = clock();
    const b = new InMemoryTokenBucket({ capacity: 3, refillPerSec: 1, now });
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await b.consume('k'));
    assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
    assert.deepEqual(results.map((r) => r.remaining), [2, 1, 0, 0]);
    assert.equal(results[3].retryAfterMs, 1000);
  });

  it('refills over time, capped at capacity', async () => {
    const now = clock();
    const b = new InMemoryTokenBucket({ capacity: 3, refillPerSec: 2, now });
    for (let i = 0; i < 3; i += 1) await b.consume('k');
    now.advance(1000); // +2 tokens
    assert.equal((await b.consume('k')).allowed, true);
    assert.equal((await b.consume('k')).allowed, true);
    assert.equal((await b.consume('k')).allowed, false);
    now.advance(60_000); // long idle: capped at 3, not 120
    const r = await b.consume('k');
    assert.equal(r.remaining, 2);
  });

  it('prune forgets buckets that have fully refilled', async () => {
    const now = clock();
    const b = new InMemoryTokenBucket({ capacity: 2, refillPerSec: 1, now });
    await b.consume('a');
    now.advance(1500);
    await b.consume('b'); // 'a' has refilled by now; 'b' has not
    b.prune();
    assert.deepEqual([...b.buckets.keys()], ['b']);
  });
});
