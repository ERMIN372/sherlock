// Base class for a data source adapter.
//
// Each authorized source plugs in as its own adapter. A source is ONLY allowed
// to expose profiles that are permitted to be indexed:
//   - profiles voluntarily submitted by the person themselves (opt-in), or
//   - datasets the operator has explicit permission to index.
//
// Adapters MUST NOT scrape social networks, bypass authentication, or defeat any
// access control / rate limiting. That is out of scope by design.
//
// A normalized profile record looks like:
//   {
//     id:         string   (unique within the source)
//     name:       string
//     profileUrl: string   (public link the person chose to share)
//     imageUrl:   string   (URL the front-end can render)
//     descriptor: number[] (128-d face descriptor, precomputed)
//     sourceId:   string
//     sourceName: string
//     consent:    boolean  (must be true to be searchable)
//   }
export class SourceAdapter {
  constructor({ id, name }) {
    if (!id) throw new Error('SourceAdapter requires an id');
    this.id = id;
    this.name = name || id;
  }

  /** @returns {Promise<Array>} normalized, consented profile records */
  async listProfiles() {
    throw new Error(`Source "${this.id}" must implement listProfiles()`);
  }

  get meta() {
    return { id: this.id, name: this.name };
  }
}
