// cl_scrn.c -- pending stub (PORTING.md "Pending stubs"). 2D HUD/layout
// rendering. Most of cl_scrn.c (SCR_DrawDebugGraph, SCR_DrawCenterString,
// SCR_ExecuteLayoutString, SCR_DrawStats, SCR_DrawLayout, ...) is internal
// and not stubbed here; only the functions screen.h/client.h declare are
// exported.
//
// screen.h declares `void SCR_SizeUp (void);` / `void SCR_SizeDown (void);`
// but cl_scrn.c only defines `SCR_SizeUp_f`/`SCR_SizeDown_f` (confirmed by
// grep) -- the header's names are stale, dropped and reported.

import { PendingPort } from "../qcommon/pending";

export function SCR_Init(): void {
  throw new PendingPort("SCR_Init");
}

export function SCR_UpdateScreen(): void {
  throw new PendingPort("SCR_UpdateScreen");
}

export function SCR_CenterPrint(_str: string): void {
  throw new PendingPort("SCR_CenterPrint");
}

export function SCR_BeginLoadingPlaque(): void {
  throw new PendingPort("SCR_BeginLoadingPlaque");
}

export function SCR_EndLoadingPlaque(): void {
  throw new PendingPort("SCR_EndLoadingPlaque");
}

export function SCR_DebugGraph(_value: number, _color: number): void {
  throw new PendingPort("SCR_DebugGraph");
}

export function SCR_TouchPics(): void {
  throw new PendingPort("SCR_TouchPics");
}

export function SCR_RunConsole(): void {
  throw new PendingPort("SCR_RunConsole");
}

export function SCR_AddDirtyPoint(_x: number, _y: number): void {
  throw new PendingPort("SCR_AddDirtyPoint");
}

export function SCR_DirtyScreen(): void {
  throw new PendingPort("SCR_DirtyScreen");
}

// client.h's general section (defined in cl_scrn.c, confirmed by grep).
export function CL_AddNetgraph(): void {
  throw new PendingPort("CL_AddNetgraph");
}
