// Tiny JSON-file persistence layer. No external DB needed for the MVP.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export class JsonDB {
  constructor(file) {
    this.file = file;
    this.data = { profiles: [] };
  }

  async load() {
    await mkdir(path.dirname(this.file), { recursive: true });
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(await readFile(this.file, 'utf8'));
      } catch {
        this.data = { profiles: [] };
      }
    }
    if (!Array.isArray(this.data.profiles)) this.data.profiles = [];
    return this;
  }

  async save() {
    await writeFile(this.file, JSON.stringify(this.data, null, 2));
  }

  listProfiles() {
    return this.data.profiles;
  }

  async addProfile(profile) {
    this.data.profiles.push(profile);
    await this.save();
    return profile;
  }

  async removeProfile(id) {
    const before = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    const removed = before !== this.data.profiles.length;
    if (removed) await this.save();
    return removed;
  }
}
