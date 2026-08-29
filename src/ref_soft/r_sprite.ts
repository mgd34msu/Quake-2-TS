/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_sprite.c (GNU GPL v2 or later) -- pending. The one
function r_local.h attributes to r_sprite.c throws PendingPort until the
real module lands.
*/

import { PendingPort } from "../qcommon/pending";

export function R_DrawSprite(): void {
  throw new PendingPort("R_DrawSprite");
}
