/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_light.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_light.c throws PendingPort until the
real module lands. Internal helpers not declared in gl_local.h
(R_RenderDlight, RecursiveLightPoint, R_AddDynamicLights, R_SetCacheState,
R_BuildLightMap) are not stubbed individually, per this unit's brief.

R_RenderDlight (the internal per-light helper R_RenderDlights loops over)
calls `V_AddBlend`, an extern the client owns (declared in gl_local.h,
defined in client/cl_view.c in the original) that src/client/cl_view.ts has
not exported yet (confirmed by grep) -- reported gap, not this unit's SCOPE
to fix; the real R_RenderDlight will need it once gl_light.c is ported.
*/

import type { Vec3 } from "../shared/math";
import type { DlightT } from "../client/ref";
import { PendingPort } from "../qcommon/pending";
import type { MnodeT } from "./gl_model";

export function R_RenderDlights(): void {
  throw new PendingPort("R_RenderDlights");
}

export function R_MarkLights(light: DlightT, bit: number, node: MnodeT): void {
  throw new PendingPort("R_MarkLights");
}

export function R_PushDlights(): void {
  throw new PendingPort("R_PushDlights");
}

export function R_LightPoint(p: Vec3, color: Vec3): void {
  throw new PendingPort("R_LightPoint");
}
