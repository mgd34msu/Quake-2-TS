// files.c -- PENDING STUB.
//
// cmd.ts (Cmd_Exec_f) and cvar.ts (the "game" cvar's latch/set path) call
// into the filesystem module. The real port of files.c is a future unit;
// until then every entry point here throws PendingPort so callers fail
// loudly and specifically instead of silently no-op'ing.
//
// Signatures are the final ones this brief specifies, so call sites written
// against this stub do not need to change when files.ts is really ported.

import { PendingPort } from "./pending";

export function FS_InitFilesystem(): void {
  throw new PendingPort("FS_InitFilesystem");
}

export function FS_SetGamedir(_dir: string): void {
  throw new PendingPort("FS_SetGamedir");
}

export function FS_Gamedir(): string {
  throw new PendingPort("FS_Gamedir");
}

export function FS_NextPath(_prevpath: string | null): string | null {
  throw new PendingPort("FS_NextPath");
}

export function FS_ExecAutoexec(): void {
  throw new PendingPort("FS_ExecAutoexec");
}

// a null return means the file was not found; FS_LoadFile has no separate
// "just return the length" mode in this port (JS callers hold the buffer,
// not a raw length + malloc'd pointer).
export function FS_LoadFile(_path: string): Uint8Array | null {
  throw new PendingPort("FS_LoadFile");
}

// no-op in this port: Uint8Array buffers are garbage collected, not
// hand-freed. Kept so ported call sites that mirror the C shape still
// compile against the eventual files.ts.
export function FS_FreeFile(_buffer: Uint8Array | null): void {
  throw new PendingPort("FS_FreeFile");
}

export function FS_FOpenFile(_filename: string): number {
  throw new PendingPort("FS_FOpenFile");
}

export function FS_FCloseFile(_handle: number): void {
  throw new PendingPort("FS_FCloseFile");
}

export function FS_Read(_buffer: Uint8Array, _len: number, _handle: number): void {
  throw new PendingPort("FS_Read");
}
