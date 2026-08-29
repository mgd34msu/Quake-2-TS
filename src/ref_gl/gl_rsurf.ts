/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_rsurf.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_rsurf.c throws PendingPort until the
real module lands. Internal helpers not declared in gl_local.h
(R_TextureAnimation, DrawGLWaterPoly, DrawGLWaterPolyLightmap, DrawGLPoly,
DrawGLFlowingPoly, R_DrawTriangleOutlines, DrawGLPolyChain,
R_BlendLightmaps, DrawTextureChains, R_DrawInlineBModel,
R_RecursiveWorldNode) are not stubbed individually. GL_BuildPolygonFromSurface/
GL_CreateSurfaceLightmap/GL_BeginBuildingLightmaps/GL_EndBuildingLightmaps
are forward-declared inside gl_model.c (not gl_local.h) for gl_model.c's own
loader to call into this file; also not stubbed here since they are outside
this file's gl_local.h-declared public surface, per this unit's brief.
*/

import type { EntityT } from "../client/ref";
import { PendingPort } from "../qcommon/pending";
import type { GlpolyT, MsurfaceT } from "./gl_model";

export function WaterWarpPolyVerts(p: GlpolyT): GlpolyT {
  throw new PendingPort("WaterWarpPolyVerts");
}

export function R_RenderBrushPoly(fa: MsurfaceT): void {
  throw new PendingPort("R_RenderBrushPoly");
}

export function R_DrawAlphaSurfaces(): void {
  throw new PendingPort("R_DrawAlphaSurfaces");
}

export function R_DrawBrushModel(e: EntityT): void {
  throw new PendingPort("R_DrawBrushModel");
}

export function R_DrawWorld(): void {
  throw new PendingPort("R_DrawWorld");
}

export function R_MarkLeaves(): void {
  throw new PendingPort("R_MarkLeaves");
}
