/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_image.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_image.c throws PendingPort until the
real module lands. Internal helpers not declared in gl_local.h (LoadTGA,
R_FloodFillSkin, GL_LightScaleTexture, GL_MipMap, GL_BuildPalettedTexture,
GL_Upload8, GL_Upload32, GL_LoadWal, Scrap_AllocBlock, Scrap_Upload) are not
stubbed individually, per this unit's brief.

`LoadPCX`'s `byte **pic, byte **palette, int *width, int *height` out
params become a returned object per PORTING.md's out-param convention
(mirrors r_image.ts's identical LoadPCX stub).
*/

import { PendingPort } from "../qcommon/pending";
import { ImageT, ImagetypeT } from "./gl_local";

export function GL_SetTexturePalette(palette: Uint32Array): void {
  throw new PendingPort("GL_SetTexturePalette");
}

export function GL_EnableMultitexture(enable: boolean): void {
  throw new PendingPort("GL_EnableMultitexture");
}

export function GL_SelectTexture(texture: number): void {
  throw new PendingPort("GL_SelectTexture");
}

export function GL_TexEnv(mode: number): void {
  throw new PendingPort("GL_TexEnv");
}

export function GL_Bind(texnum: number): void {
  throw new PendingPort("GL_Bind");
}

export function GL_MBind(target: number, texnum: number): void {
  throw new PendingPort("GL_MBind");
}

export function GL_TextureMode(str: string): void {
  throw new PendingPort("GL_TextureMode");
}

export function GL_TextureAlphaMode(str: string): void {
  throw new PendingPort("GL_TextureAlphaMode");
}

export function GL_TextureSolidMode(str: string): void {
  throw new PendingPort("GL_TextureSolidMode");
}

export function GL_ImageList_f(): void {
  throw new PendingPort("GL_ImageList_f");
}

export function LoadPCX(filename: string): { pic: Uint8Array | null; palette: Uint8Array | null; width: number; height: number } {
  throw new PendingPort("LoadPCX");
}

export function GL_ResampleTexture(inData: Uint32Array, inwidth: number, inheight: number, outwidth: number, outheight: number): Uint32Array {
  throw new PendingPort("GL_ResampleTexture");
}

export function GL_LoadPic(name: string, pic: Uint8Array, width: number, height: number, type: ImagetypeT, bits: number): ImageT {
  throw new PendingPort("GL_LoadPic");
}

export function GL_FindImage(name: string, type: ImagetypeT): ImageT | null {
  throw new PendingPort("GL_FindImage");
}

export function R_RegisterSkin(name: string): ImageT | null {
  throw new PendingPort("R_RegisterSkin");
}

export function GL_FreeUnusedImages(): void {
  throw new PendingPort("GL_FreeUnusedImages");
}

export function Draw_GetPalette(): number {
  throw new PendingPort("Draw_GetPalette");
}

export function GL_InitImages(): void {
  throw new PendingPort("GL_InitImages");
}

export function GL_ShutdownImages(): void {
  throw new PendingPort("GL_ShutdownImages");
}

// R_TranslatePlayerSkin is declared in gl_local.h but (confirmed by grepping
// the full ref_gl tree) is not defined in any gl_*.c file in this v3.19
// source -- a dead declaration, like cl_pred.ts's CL_InitPrediction/
// CL_PredictMove. Not stubbed; reported as a dropped dead declaration
// rather than a gap.
