// Base adapter for data source checks
// Each concrete adapter should export an object with:
//   sourceId: string (unique identifier)
//   sourceName: string (human readable name)
//   async checkExposure(email: string): { findings?: Array<any> }
// This file provides a minimal abstract class for future adapters.

export class BaseSourceAdapter {
  constructor(sourceId, sourceName) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
  }

  // Override in subclass. Should return an object with optional `findings` array.
  async checkExposure(_email) {
    throw new Error('checkExposure must be implemented by subclass');
  }
}
