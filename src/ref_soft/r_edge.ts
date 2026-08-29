/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_edge.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_edge.c throws PendingPort until the real
module lands. R_SurfacePatch/R_EdgeCodeStart/R_EdgeCodeEnd are the portable
(`#ifndef id386`) no-op bodies in the C original; r_misc.c also defines a
duplicate no-op R_SurfacePatch under its own `#if !id386` guard (an
apparent leftover duplicate in the original source) -- this module is
treated as the single owner of the three since r_local.h lists them
together right after `R_Surf8Start`/`R_Surf16Start`. Deviation reported.

Statics not declared in r_local.h (R_CleanupSpan, R_LeadingEdgeBackwards,
R_TrailingEdge, R_LeadingEdge, R_GenerateSpans, R_GenerateSpansBackward,
D_MipLevelForScale, D_FlatFillSurface, D_CalcGradients, D_BackgroundSurf,
D_TurbulentSurf, D_SkySurf, D_SolidSurf, D_DrawflatSurfaces) are internal to
the future real port and are not stubbed individually.
*/

import { PendingPort } from "../qcommon/pending";
import type { EdgeT } from "./r_local";

export function R_SurfacePatch(): void {
  throw new PendingPort("R_SurfacePatch");
}

export function R_EdgeCodeStart(): void {
  throw new PendingPort("R_EdgeCodeStart");
}

export function R_EdgeCodeEnd(): void {
  throw new PendingPort("R_EdgeCodeEnd");
}

export function R_BeginEdgeFrame(): void {
  throw new PendingPort("R_BeginEdgeFrame");
}

export function R_InsertNewEdges(edgestoadd: EdgeT, edgelist: EdgeT): void {
  throw new PendingPort("R_InsertNewEdges");
}

export function R_RemoveEdges(pedge: EdgeT): void {
  throw new PendingPort("R_RemoveEdges");
}

export function R_StepActiveU(pedge: EdgeT): void {
  throw new PendingPort("R_StepActiveU");
}

export function R_ScanEdges(): void {
  throw new PendingPort("R_ScanEdges");
}

export function D_DrawSurfaces(): void {
  throw new PendingPort("D_DrawSurfaces");
}
