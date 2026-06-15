#!/usr/bin/env node
/**
 * Smoke test for a running Sherlock instance.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 *
 * Verifies: homepage, /api/health, payment GET/POST, a real demo/live search,
 * and file-type validation. Exits non-zero on any failure.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

// 1x1 JPEG (valid minimal image).
const JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////////////////8AABEIAAEAAQMBIgACEQEDEQH/xAAUAAEAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/AD//2Q==";

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  // homepage
  const home = await fetch(`${BASE}/`);
  check("homepage 200", home.status === 200, `status ${home.status}`);

  // health
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check("health ok", health.status === "ok", `provider=${health.provider}`);

  // payment listing
  const packs = await fetch(`${BASE}/api/payment`).then((r) => r.json());
  check("payment packs", Array.isArray(packs.packs) && packs.packs.length > 0);

  // payment purchase (demo)
  const pay = await fetch(`${BASE}/api/payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ packId: "plus" }),
  }).then((r) => r.json());
  check("payment purchase", pay.success === true, `granted=${pay.granted}`);

  // search — phase 1: start
  const fd = new FormData();
  const bytes = Uint8Array.from(Buffer.from(JPEG_B64, "base64"));
  fd.append("image", new Blob([bytes], { type: "image/jpeg" }), "face.jpg");
  const startRes = await fetch(`${BASE}/api/search`, { method: "POST", body: fd });
  const start = await startRes.json();
  check(
    "search starts",
    startRes.ok && !!start.searchId,
    startRes.ok ? `provider=${start.provider} demo=${start.demo}` : `status ${startRes.status}`,
  );

  // search — phase 2: poll to completion
  let done = null;
  for (let i = 0; i < 30 && start.searchId; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${BASE}/api/search?id=${encodeURIComponent(start.searchId)}`);
    const poll = await pollRes.json();
    if (!pollRes.ok) {
      done = { error: poll.code };
      break;
    }
    if (poll.status === "done") {
      done = poll;
      break;
    }
  }
  check(
    "search completes",
    done && done.status === "done",
    done && done.status === "done" ? `count=${done.count}` : `result=${JSON.stringify(done)}`,
  );

  // validation: wrong type
  const badFd = new FormData();
  badFd.append("image", new Blob(["not an image"], { type: "text/plain" }), "x.txt");
  const bad = await fetch(`${BASE}/api/search`, { method: "POST", body: badFd });
  check("rejects bad file type", bad.status === 400, `status ${bad.status}`);

  // poll without id
  const noId = await fetch(`${BASE}/api/search`);
  check("poll requires id", noId.status === 400, `status ${noId.status}`);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
