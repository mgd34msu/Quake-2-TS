/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_draw.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_draw.c throws PendingPort until the real
module lands. `Draw_StretchPicImplementation` is a static internal helper
(not declared in r_local.h) and is not stubbed individually -- only the
header-attributed entry points are, per this unit's brief.
*/

import { PendingPort } from "../qcommon/pending";
import type { ImageT } from "./r_model";

export function Draw_FindPic(name: string): ImageT | null {
  throw new PendingPort("Draw_FindPic");
}

export function Draw_InitLocal(): void {
  throw new PendingPort("Draw_InitLocal");
}

export function Draw_Char(x: number, y: number, c: number): void {
  throw new PendingPort("Draw_Char");
}

export function Draw_GetPicSize(name: string): { w: number; h: number } {
  throw new PendingPort("Draw_GetPicSize");
}

export function Draw_StretchPic(x: number, y: number, w: number, h: number, name: string): void {
  throw new PendingPort("Draw_StretchPic");
}

export function Draw_StretchRaw(x: number, y: number, w: number, h: number, cols: number, rows: number, data: Uint8Array): void {
  throw new PendingPort("Draw_StretchRaw");
}

export function Draw_Pic(x: number, y: number, name: string): void {
  throw new PendingPort("Draw_Pic");
}

export function Draw_TileClear(x: number, y: number, w: number, h: number, name: string): void {
  throw new PendingPort("Draw_TileClear");
}

export function Draw_Fill(x: number, y: number, w: number, h: number, c: number): void {
  throw new PendingPort("Draw_Fill");
}

export function Draw_FadeScreen(): void {
  throw new PendingPort("Draw_FadeScreen");
}
