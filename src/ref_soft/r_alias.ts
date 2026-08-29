/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_alias.c (GNU GPL v2 or later) -- pending. The one
function r_local.h attributes to r_alias.c throws PendingPort until the
real module lands. `R_AliasCheckFrameBBox`/`R_AliasCheckBBox`/
`R_AliasTransformVector`/`R_AliasPreparePoints`/`R_AliasSetUpTransform`/
`R_AliasTransformFinalVerts`/`R_AliasProjectAndClipTestFinalVert`/
`R_AliasSetupSkin`/`R_AliasSetupLighting`/`R_AliasSetupFrames`/
`R_AliasSetUpLerpData` are internal to the model-drawing pipeline (not
declared in r_local.h) and are not stubbed individually.
*/

import { PendingPort } from "../qcommon/pending";

export function R_AliasDrawModel(): void {
  throw new PendingPort("R_AliasDrawModel");
}
