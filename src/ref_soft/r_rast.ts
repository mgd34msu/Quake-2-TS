/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_rast.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_rast.c throws PendingPort until the real
module lands. `R_EmitSkyBox`/`R_EmitCachedEdge` are static internal helpers
(not declared in r_local.h) and are not stubbed individually.
*/

import { PendingPort } from "../qcommon/pending";
import type { BedgeT, ClipplaneT } from "./r_local";
import type { MsurfaceT, MvertexT } from "./r_model";

export function R_InitSkyBox(): void {
  throw new PendingPort("R_InitSkyBox");
}

export function R_EmitEdge(pv0: MvertexT, pv1: MvertexT): void {
  throw new PendingPort("R_EmitEdge");
}

export function R_ClipEdge(pv0: MvertexT, pv1: MvertexT, clip: ClipplaneT): void {
  throw new PendingPort("R_ClipEdge");
}

export function R_RenderFace(fa: MsurfaceT, clipflags: number): void {
  throw new PendingPort("R_RenderFace");
}

export function R_RenderBmodelFace(pedges: BedgeT, psurf: MsurfaceT): void {
  throw new PendingPort("R_RenderBmodelFace");
}
