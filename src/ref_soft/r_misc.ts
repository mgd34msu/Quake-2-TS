/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_misc.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_misc.c throws PendingPort until the real
module lands. `D_Patch`/`R_SetUpFrustumIndexes`/`R_ViewChanged` are static
internal helpers (not declared in r_local.h) and are not stubbed
individually. `R_SurfacePatch` is also defined here in the C original
(duplicate of r_edge.c's copy, both no-ops under the portable
`#ifndef id386`/`#if !id386` guard) -- attributed to r_edge.ts instead; see
that module's header comment.

`R_TransformPlane`'s `float *normal, float *dist` out params become a
returned `{ normal, dist }` object per PORTING.md's out-param convention.
*/

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { MplaneT } from "./r_model";

export function D_ViewChanged(): void {
  throw new PendingPort("D_ViewChanged");
}

export function R_PrintTimes(): void {
  throw new PendingPort("R_PrintTimes");
}

export function R_PrintDSpeeds(): void {
  throw new PendingPort("R_PrintDSpeeds");
}

export function R_PrintAliasStats(): void {
  throw new PendingPort("R_PrintAliasStats");
}

export function R_TransformFrustum(): void {
  throw new PendingPort("R_TransformFrustum");
}

export function R_TransformPlane(p: MplaneT): { normal: Vec3; dist: number } {
  throw new PendingPort("R_TransformPlane");
}

export function R_SetupFrame(): void {
  throw new PendingPort("R_SetupFrame");
}

export function R_ScreenShot_f(): void {
  throw new PendingPort("R_ScreenShot_f");
}
