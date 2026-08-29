/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_part.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_part.c throws PendingPort until the real
module lands.
*/

import { PendingPort } from "../qcommon/pending";

export function R_DrawParticle(): void {
  throw new PendingPort("R_DrawParticle");
}

export function R_DrawParticles(): void {
  throw new PendingPort("R_DrawParticles");
}
