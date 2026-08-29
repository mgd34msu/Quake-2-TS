/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_draw.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_draw.c throws PendingPort until the
real module lands. `Scrap_Upload` is forward-declared here but defined in
gl_image.c (not stubbed in this file -- gl_image.ts owns it); not stubbed
individually here since gl_local.h does not declare it as part of this
file's public surface.
*/

import { PendingPort } from "../qcommon/pending";
import type { ImageT } from "./gl_local";

export function Draw_InitLocal(): void {
  throw new PendingPort("Draw_InitLocal");
}

export function Draw_Char(x: number, y: number, num: number): void {
  throw new PendingPort("Draw_Char");
}

export function Draw_FindPic(pic: string): ImageT | null {
  throw new PendingPort("Draw_FindPic");
}

export function Draw_GetPicSize(name: string): { w: number; h: number } {
  throw new PendingPort("Draw_GetPicSize");
}

export function Draw_StretchPic(x: number, y: number, w: number, h: number, pic: string): void {
  throw new PendingPort("Draw_StretchPic");
}

export function Draw_Pic(x: number, y: number, pic: string): void {
  throw new PendingPort("Draw_Pic");
}

export function Draw_TileClear(x: number, y: number, w: number, h: number, pic: string): void {
  throw new PendingPort("Draw_TileClear");
}

export function Draw_Fill(x: number, y: number, w: number, h: number, c: number): void {
  throw new PendingPort("Draw_Fill");
}

export function Draw_FadeScreen(): void {
  throw new PendingPort("Draw_FadeScreen");
}

export function Draw_StretchRaw(x: number, y: number, w: number, h: number, cols: number, rows: number, data: Uint8Array): void {
  throw new PendingPort("Draw_StretchRaw");
}
