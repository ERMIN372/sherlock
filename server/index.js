import express from 'express';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JsonDB } from './db.js';
import { rankMatches } from './matcher.js';
import { SourceRegistry } from './sources/index.js';
import { ManualOptInSource } from './sources/manualOptIn.js';
import { AuthorizedDirectorySource } from './sources/authorizedDirectory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.SHERLOCK_DATA_DIR
  ? path.resolve(process.env.SHERLOCK_DATA_DIR)
  : path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DESCRIPTOR_LEN = 128;

export async function createApp() {
  const db = await new JsonDB(path.join(DATA_DIR, 'db.json')).load();
  await mkdir(UPLOADS_DIR, { recursive: true });

  const sources = new SourceRegistry()
    .register(new ManualOptInSource(db))
    .register(new AuthorizedDirectorySource(path.join(DATA_DIR, 'sources')));

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use(express.static(PUBLIC_DIR));
  app.use('/uploads', express.static(UPLOADS_DIR));

  const isDescriptor = (d) =>
    Array.isArray(d) && d.length === DESCRIPTOR_LEN && d.every((n) => typeof n === 'number' && Number.isFinite(n));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/sources', async (_req, res) => {
    const profiles = await sources.allProfiles();
    const counts = {};
    for (const p of profiles) counts[p.sourceId] = (counts[p.sourceId] || 0) + 1;
    res.json({
      sources: sources.list().map((s) => ({ ...s, count: counts[s.id] || 0 })),
      total: profiles.length,
    });
  });

  // Voluntary opt-in: a person adds their OWN public profile to be searchable.
  app.post('/api/profiles', async (req, res) => {
    const { name, profileUrl, descriptor, image, consent } = req.body || {};
    if (consent !== true) {
      return res.status(400).json({ error: 'Consent is required to be added to the index.' });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'A display name is required.' });
    }
    if (!isDescriptor(descriptor)) {
      return res.status(400).json({ error: 'No face was detected in the photo. Try a clearer, front-facing photo.' });
    }

    const id = randomUUID();
    let imageUrl = '';
    if (typeof image === 'string') {
      const m = image.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
      if (m) {
        const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
        const file = `${id}.${ext}`;
        await writeFile(path.join(UPLOADS_DIR, file), Buffer.from(m[2], 'base64'));
        imageUrl = `/uploads/${file}`;
      }
    }

    const profile = {
      id,
      name: name.trim().slice(0, 80),
      profileUrl: typeof profileUrl === 'string' ? profileUrl.trim().slice(0, 300) : '',
      imageUrl,
      descriptor,
      sourceId: 'opt-in',
      consent: true,
      createdAt: new Date().toISOString(),
    };
    await db.addProfile(profile);
    res.status(201).json({ id, name: profile.name, imageUrl });
  });

  // Withdraw consent / remove yourself.
  app.delete('/api/profiles/:id', async (req, res) => {
    const removed = await db.removeProfile(req.params.id);
    res.status(removed ? 200 : 404).json({ removed });
  });

  // Search: client sends a face descriptor, server ranks consented profiles.
  app.post('/api/search', async (req, res) => {
    const { descriptor } = req.body || {};
    if (!isDescriptor(descriptor)) {
      return res.status(400).json({ error: 'No face detected. Upload a clear, front-facing photo.' });
    }
    const profiles = await sources.allProfiles();
    const matches = rankMatches(descriptor, profiles);
    res.json({ searched: profiles.length, count: matches.length, matches });
  });

  return app;
}

// Start the server unless imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`Sherlock Web (consent-based face search) running on http://localhost:${PORT}`);
  });
}
