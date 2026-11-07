export class WorkspaceConflictError extends Error {
  constructor() {
    super("This workspace changed while you were saving. Reload it and try again.");
    this.name = "WorkspaceConflictError";
  }
}
