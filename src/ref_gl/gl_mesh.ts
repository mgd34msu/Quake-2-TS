/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_mesh.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_mesh.c throws PendingPort until the
real module lands. Internal helpers not declared in gl_local.h
(GL_LerpVerts, GL_DrawAliasFrameLerp, GL_DrawAliasShadow) are not stubbed
individually, per this unit's brief.
*/

import type { EntityT } from "../client/ref";
import { PendingPort } from "../qcommon/pending";

export function R_DrawAliasModel(e: EntityT): void {
  throw new PendingPort("R_DrawAliasModel");
}
