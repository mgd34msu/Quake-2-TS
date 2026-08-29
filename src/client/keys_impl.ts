// keys.c -- pending stub (PORTING.md "Pending stubs"). Named keys_impl.ts,
// not keys.ts, because keys.h's constant/global surface already owns that
// basename (K_*/keybindings/etc. in keys.ts) -- a deliberate exception to
// PORTING.md's "same basename" rule, reported per this unit's brief.
// CompleteCommand/Key_Console/Key_Message/Key_StringToKeynum/Key_Unbind_f/
// Key_Unbindall_f/Key_Bind_f/Key_Bindlist_f are internal to keys.c and are
// not stubbed here.
//
// Key_KeynumToString is declared in client.h under its "cl_input" section,
// but is actually defined in keys.c (confirmed by grep) -- ported here
// instead of in cl_input.ts.

import { PendingPort } from "../qcommon/pending";

export function Key_Event(_key: number, _down: boolean, _time: number): void {
  throw new PendingPort("Key_Event");
}

export function Key_Init(): void {
  throw new PendingPort("Key_Init");
}

// C's `void Key_WriteBindings (FILE *f)` takes an already-open file handle;
// ported as a platform file-handle number per PORTING.md's `FILE*` idiom.
export function Key_WriteBindings(_f: number): void {
  throw new PendingPort("Key_WriteBindings");
}

export function Key_SetBinding(_keynum: number, _binding: string | null): void {
  throw new PendingPort("Key_SetBinding");
}

export function Key_ClearStates(): void {
  throw new PendingPort("Key_ClearStates");
}

export function Key_GetKey(): number {
  throw new PendingPort("Key_GetKey");
}

export function Key_KeynumToString(_keynum: number): string {
  throw new PendingPort("Key_KeynumToString");
}
