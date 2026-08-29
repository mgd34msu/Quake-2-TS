// console.c -- pending stub (PORTING.md "Pending stubs"). Named
// console_impl.ts, not console.ts, because console.h's type/global surface
// already owns that basename (ConsoleT/con in console.ts) -- a deliberate
// exception to PORTING.md's "same basename" rule, reported per this unit's
// brief. Key_ClearTyping/Con_Linefeed/Con_Dump_f/Con_MessageMode_f/
// Con_MessageMode2_f/Con_ToggleChat_f/Con_DrawInput are internal to
// console.c and are not stubbed here.
//
// console.h also declares `void Con_DrawCharacter (int cx, int line, int
// num);`, but it is never defined anywhere in the v3.19 client tree
// (confirmed by grep) -- a dead declaration, dropped and reported.

import { PendingPort } from "../qcommon/pending";

export function DrawString(_x: number, _y: number, _s: string): void {
  throw new PendingPort("DrawString");
}

export function DrawAltString(_x: number, _y: number, _s: string): void {
  throw new PendingPort("DrawAltString");
}

export function Con_CheckResize(): void {
  throw new PendingPort("Con_CheckResize");
}

export function Con_Init(): void {
  throw new PendingPort("Con_Init");
}

export function Con_DrawConsole(_frac: number): void {
  throw new PendingPort("Con_DrawConsole");
}

export function Con_Print(_txt: string): void {
  throw new PendingPort("Con_Print");
}

export function Con_CenteredPrint(_text: string): void {
  throw new PendingPort("Con_CenteredPrint");
}

export function Con_Clear_f(): void {
  throw new PendingPort("Con_Clear_f");
}

export function Con_DrawNotify(): void {
  throw new PendingPort("Con_DrawNotify");
}

export function Con_ClearNotify(): void {
  throw new PendingPort("Con_ClearNotify");
}

export function Con_ToggleConsole_f(): void {
  throw new PendingPort("Con_ToggleConsole_f");
}
