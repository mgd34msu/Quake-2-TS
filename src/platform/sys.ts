// linux/sys_linux.c + win32/sys_win.c, etc. -- one portable bun implementation
// of the non-portable system services qcommon.h declares. Only the pieces
// common.c/cvar.c/cmd.c actually call are ported here; the rest of sys_*.c
// (Sys_Init, Sys_GetGameAPI, Sys_SendKeyEvents, ...) belongs to a future unit.

import { Com_sprintf } from "../shared/q_shared";

export const curtime = { value: 0 };

let startTime: number | null = null;

// monotonic clock, integer ms since first call
export function Sys_Milliseconds(): number {
  if (startTime === null) {
    startTime = performance.now();
  }
  const ms = Math.floor(performance.now() - startTime);
  curtime.value = ms;
  return ms;
}

export function Sys_ConsoleOutput(text: string): void {
  process.stdout.write(text);
}

// Sys_Error is fatal and does not return in the original engine.
export function Sys_Error(fmt: string, ...args: Array<string | number>): never {
  const msg = Com_sprintf(fmt, ...args);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

export function Sys_Quit(): never {
  process.exit(0);
}

// no interactive console yet
export function Sys_ConsoleInput(): string | null {
  return null;
}
