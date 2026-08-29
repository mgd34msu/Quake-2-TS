/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_rmisc.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_rmisc.c throws PendingPort until the
real module lands. `GL_Strings_f` (a Cmd_AddCommand-registered console
command, not declared in gl_local.h) is not stubbed individually, per this
unit's brief.
*/

import { PendingPort } from "../qcommon/pending";

export function R_InitParticleTexture(): void {
  throw new PendingPort("R_InitParticleTexture");
}

export function GL_ScreenShot_f(): void {
  throw new PendingPort("GL_ScreenShot_f");
}

export function GL_SetDefaultState(): void {
  throw new PendingPort("GL_SetDefaultState");
}

export function GL_UpdateSwapInterval(): void {
  throw new PendingPort("GL_UpdateSwapInterval");
}
