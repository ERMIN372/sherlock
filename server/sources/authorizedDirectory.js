import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { SourceAdapter } from './base.js';

// Example of an EXTERNAL authorized source plugged in via the adapter interface.
//
// It indexes pre-approved datasets dropped on disk under data/sources/<name>/,
// each described by a manifest.json the operator is permitted to use. Nothing is
// fetched from the internet and no access control is bypassed — this simply
// demonstrates how additional permitted sources extend the system.
//
// manifest.json schema:
// {
//   "name": "Conference 2026 speakers (opt-in)",
//   "consent": true,
//   "profiles": [
//     { "id": "...", "name": "...", "profileUrl": "...",
//       "imageUrl": "...", "descriptor": [128 numbers] }
//   ]
// }
export class AuthorizedDirectorySource extends SourceAdapter {
  constructor(rootDir) {
    super({ id: 'authorized-dir', name: 'Authorized datasets' });
    this.rootDir = rootDir;
  }

  async listProfiles() {
    if (!existsSync(this.rootDir)) return [];
    const entries = await readdir(this.rootDir);
    const out = [];

    for (const entry of entries) {
      const dir = path.join(this.rootDir, entry);
      const manifestPath = path.join(dir, 'manifest.json');
      try {
        if (!(await stat(dir)).isDirectory()) continue;
        if (!existsSync(manifestPath)) continue;
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

        // A whole dataset is skipped unless it is explicitly marked consented.
        if (manifest.consent !== true || !Array.isArray(manifest.profiles)) continue;

        for (const p of manifest.profiles) {
          if (!Array.isArray(p.descriptor)) continue;
          out.push({
            id: `${entry}:${p.id}`,
            name: p.name,
            profileUrl: p.profileUrl,
            imageUrl: p.imageUrl,
            descriptor: p.descriptor,
            sourceId: this.id,
            sourceName: manifest.name || entry,
            consent: true,
          });
        }
      } catch {
        // A malformed dataset must never take the whole search down.
        continue;
      }
    }
    return out;
  }
}
