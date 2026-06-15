// Registry that aggregates every authorized source adapter behind one interface.
export class SourceRegistry {
  constructor() {
    this.adapters = new Map();
  }

  register(adapter) {
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  list() {
    return [...this.adapters.values()].map((a) => a.meta);
  }

  // Merge consented profiles from all registered sources.
  async allProfiles() {
    const results = await Promise.all(
      [...this.adapters.values()].map(async (a) => {
        try {
          return await a.listProfiles();
        } catch (err) {
          console.error(`Source "${a.id}" failed:`, err.message);
          return [];
        }
      })
    );
    return results.flat();
  }
}
