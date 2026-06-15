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

  // search
  const fd = new FormData();
  const bytes = Uint8Array.from(Buffer.from(JPEG_B64, "base64"));
  fd.append("image", new Blob([bytes], { type: "image/jpeg" }), "face.jpg");
  const searchRes = await fetch(`${BASE}/api/search`, { method: "POST", body: fd });
  const search = await searchRes.json();
  check(
    "search responds",
    searchRes.ok,
    searchRes.ok ? `provider=${search.provider} count=${search.count}` : `status ${searchRes.status}`,
  );

  // validation: wrong type
  const badFd = new FormData();
  badFd.append("image", new Blob(["not an image"], { type: "text/plain" }), "x.txt");
  const bad = await fetch(`${BASE}/api/search`, { method: "POST", body: badFd });
  check("rejects bad file type", bad.status === 400, `status ${bad.status}`);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
