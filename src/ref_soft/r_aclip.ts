/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_aclip.c (GNU GPL v2 or later) -- pending. The one
function r_local.h attributes to r_aclip.c throws PendingPort until the
real module lands. `R_Alias_clip_top/bottom/left/right`/`R_AliasClip` are
static internal helpers (not declared in r_local.h) and are not stubbed
individually.
*/

import { PendingPort } from "../qcommon/pending";
import type { FinalvertT } from "./r_local";

export function R_AliasClipTriangle(index0: FinalvertT, index1: FinalvertT, index2: FinalvertT): void {
  throw new PendingPort("R_AliasClipTriangle");
}
