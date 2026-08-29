/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_poly.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_poly.c throws PendingPort until the real
module lands. The many `R_DrawSpanlet*`/`R_Polygon*`/`R_ClipAndDrawPoly`/
`R_BuildPolygonFromSurface`/`R_DrawPoly` helpers are static internals (not
declared in r_local.h) and are not stubbed individually.

`R_ClearPolyList` and `R_DrawPolyList` are declared in r_local.h but have no
definition anywhere in ref_soft's .c or .asm sources (dead/stale
declarations, like r_surf.c's R_DrawSurfaceBlock8/16) -- reported omission,
no stub exists for either.
*/

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";

export function R_DrawAlphaSurfaces(): void {
  throw new PendingPort("R_DrawAlphaSurfaces");
}

export function R_IMFlatShadedQuad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: number, alpha: number): void {
  throw new PendingPort("R_IMFlatShadedQuad");
}
