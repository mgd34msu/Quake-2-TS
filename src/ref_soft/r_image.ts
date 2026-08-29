/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_image.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_image.c throws PendingPort until the
real module lands. `R_FindFreeImage`/`R_LoadWal` are static internal
helpers (not declared in r_local.h) and are not stubbed individually.

`LoadPCX`'s `byte **pic, byte **palette, int *width, int *height` out
params become a returned object per PORTING.md's out-param convention.
*/

import { PendingPort } from "../qcommon/pending";
import type { ImageT, ImagetypeT } from "./r_model";

export function LoadPCX(filename: string): { pic: Uint8Array | null; palette: Uint8Array | null; width: number; height: number } {
  throw new PendingPort("LoadPCX");
}

export function R_InitImages(): void {
  throw new PendingPort("R_InitImages");
}

export function R_ShutdownImages(): void {
  throw new PendingPort("R_ShutdownImages");
}

export function R_FindImage(name: string, type: ImagetypeT): ImageT | null {
  throw new PendingPort("R_FindImage");
}

export function R_FreeUnusedImages(): void {
  throw new PendingPort("R_FreeUnusedImages");
}

export function R_RegisterSkin(name: string): ImageT | null {
  throw new PendingPort("R_RegisterSkin");
}
