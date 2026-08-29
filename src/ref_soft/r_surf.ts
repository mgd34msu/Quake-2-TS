/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_surf.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_surf.c throws PendingPort until the real
module lands. `R_TextureAnimation`/`D_SCAlloc`/`D_SCDump`/`D_log2` are
static internal helpers (not declared in r_local.h) and are not stubbed
individually. `R_DrawSurfaceBlock8` (no mip suffix) and
`R_DrawSurfaceBlock16` are declared in r_local.h but have no definition
anywhere in ref_soft's .c or .asm sources (dead/stale declarations) --
reported omission, no stub exists for either.
*/

import { PendingPort } from "../qcommon/pending";
import type { SurfcacheT } from "./r_local";
import type { MsurfaceT } from "./r_model";

export function R_DrawSurface(): void {
  throw new PendingPort("R_DrawSurface");
}

export function R_DrawSurfaceBlock8_mip0(): void {
  throw new PendingPort("R_DrawSurfaceBlock8_mip0");
}

export function R_DrawSurfaceBlock8_mip1(): void {
  throw new PendingPort("R_DrawSurfaceBlock8_mip1");
}

export function R_DrawSurfaceBlock8_mip2(): void {
  throw new PendingPort("R_DrawSurfaceBlock8_mip2");
}

export function R_DrawSurfaceBlock8_mip3(): void {
  throw new PendingPort("R_DrawSurfaceBlock8_mip3");
}

export function R_InitCaches(): void {
  throw new PendingPort("R_InitCaches");
}

export function D_FlushCaches(): void {
  throw new PendingPort("D_FlushCaches");
}

export function D_CacheSurface(surface: MsurfaceT, miplevel: number): SurfcacheT {
  throw new PendingPort("D_CacheSurface");
}
