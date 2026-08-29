/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_light.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_light.c throws PendingPort until the
real module lands. `R_MarkLights`/`R_AddDynamicLights`/`R_BuildLightMap`
are static internal helpers (not declared in r_local.h) and are not
stubbed individually.

`R_DLightPoint` is declared in r_local.h but has no definition anywhere in
ref_soft's .c or .asm sources (dead/stale declaration, like r_surf.c's
R_DrawSurfaceBlock8/16) -- reported omission, no stub exists for it.
*/

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { ModelT } from "./r_model";

export function R_PushDlights(model: ModelT): void {
  throw new PendingPort("R_PushDlights");
}

export function R_LightPoint(p: Vec3, color: Vec3): void {
  throw new PendingPort("R_LightPoint");
}
