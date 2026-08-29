// Marker error for functions that belong to a C module not yet ported.
// See PORTING.md "Pending stubs". Deleted, with all references proven gone,
// once the owning unit lands.
export class PendingPort extends Error {
  constructor(name: string) {
    super(`not yet ported: ${name}`);
    this.name = "PendingPort";
  }
}
