/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_bsp.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_bsp.c throws PendingPort until the real
module lands.
*/

import { PendingPort } from "../qcommon/pending";
import type { ModelT, MnodeT } from "./r_model";

export function R_RenderWorld(): void {
  throw new PendingPort("R_RenderWorld");
}

export function R_DrawSubmodelPolygons(pmodel: ModelT, clipflags: number, topnode: MnodeT): void {
  throw new PendingPort("R_DrawSubmodelPolygons");
}

export function R_DrawSolidClippedSubmodelPolygons(pmodel: ModelT, topnode: MnodeT): void {
  throw new PendingPort("R_DrawSolidClippedSubmodelPolygons");
}

export function R_RotateBmodel(): void {
  throw new PendingPort("R_RotateBmodel");
}
