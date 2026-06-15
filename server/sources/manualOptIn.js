import { SourceAdapter } from './base.js';

// The core, fully consent-based source: people add their OWN public profile
// through the "Add me" page. Backed directly by the app database.
export class ManualOptInSource extends SourceAdapter {
  constructor(db) {
    super({ id: 'opt-in', name: 'Voluntary opt-in' });
    this.db = db;
  }

  async listProfiles() {
    return this.db
      .listProfiles()
      .filter((p) => p.consent === true)
      .map((p) => ({
        id: p.id,
        name: p.name,
        profileUrl: p.profileUrl,
        imageUrl: p.imageUrl,
        descriptor: p.descriptor,
        sourceId: this.id,
        sourceName: this.name,
        consent: true,
      }));
  }
}
