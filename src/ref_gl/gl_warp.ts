/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_warp.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_warp.c throws PendingPort until the
real module lands. Internal helpers not declared in gl_local.h (BoundPoly,
SubdividePolygon, DrawSkyPolygon, ClipSkyPolygon, MakeSkyVec) are not
stubbed individually, per this unit's brief.

`R_SetSky` is not declared in gl_local.h itself (it is forward-declared
locally inside gl_rmain.c, right where `refexport_t re` is assembled, the
same way `R_BeginRegistration`/`R_RegisterModel`/`R_EndRegistration` are
forward-declared for gl_model.c's benefit -- see that file's header
comment); stubbed here anyway since gl_warp.c is where it is actually
defined, and gl_rmain.ts's GetRefAPI needs a real (if pending) implementation
to wire into RefExports.SetSky, mirroring r_main.ts's identical need for its
own R_SetSky.
*/

import type { Vec3 } from "../shared/math";
import type { MsurfaceT } from "./gl_model";
import { PendingPort } from "../qcommon/pending";

export function GL_SubdivideSurface(fa: MsurfaceT): void {
  throw new PendingPort("GL_SubdivideSurface");
}

export function EmitWaterPolys(fa: MsurfaceT): void {
  throw new PendingPort("EmitWaterPolys");
}

export function R_AddSkySurface(fa: MsurfaceT): void {
  throw new PendingPort("R_AddSkySurface");
}

export function R_ClearSkyBox(): void {
  throw new PendingPort("R_ClearSkyBox");
}

export function R_DrawSkyBox(): void {
  throw new PendingPort("R_DrawSkyBox");
}

export function R_SetSky(name: string, rotate: number, axis: Vec3): void {
  throw new PendingPort("R_SetSky");
}
