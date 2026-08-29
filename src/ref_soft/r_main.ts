/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_main.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_main.c throws PendingPort until the real
module lands, EXCEPT GetRefAPI: that seam has to exist and return a real
RefExports object today so src/client (and this unit's own test) has
something to construct/call, exactly the way src/game/g_main.ts's
GetGameAPI returns a real GameExports wired to (mostly) pending g_*.ts
stubs. Calling any of the RefExports methods still throws PendingPort --
only the wiring itself is real.
*/

import type { RefExports, RefImports, EntityT, RefdefT } from "../client/ref";
import { API_VERSION } from "../client/ref";
import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import { SWimp_AppActivate, SWimp_EndFrame } from "../platform/swimp";
import { SetRefImports } from "./r_local";
import { R_BeginRegistration, R_EndRegistration, R_RegisterModel } from "./r_model";
import { R_RegisterSkin } from "./r_image";
import { Draw_Char, Draw_Fill, Draw_FadeScreen, Draw_FindPic, Draw_GetPicSize, Draw_Pic, Draw_StretchPic, Draw_StretchRaw, Draw_TileClear } from "./r_draw";

export function R_InitTurb(): void {
  throw new PendingPort("R_InitTurb");
}

export function R_Register(): void {
  throw new PendingPort("R_Register");
}

export function R_UnRegister(): void {
  throw new PendingPort("R_UnRegister");
}

export function R_Init(hInstance: unknown, wndProc: unknown): boolean {
  throw new PendingPort("R_Init");
}

export function R_Shutdown(): void {
  throw new PendingPort("R_Shutdown");
}

export function R_NewMap(): void {
  throw new PendingPort("R_NewMap");
}

export function R_RenderFrame(fd: RefdefT): void {
  throw new PendingPort("R_RenderFrame");
}

export function R_BeginFrame(camera_separation: number): void {
  throw new PendingPort("R_BeginFrame");
}

export function R_GammaCorrectAndSetPalette(pal: Uint8Array): void {
  throw new PendingPort("R_GammaCorrectAndSetPalette");
}

export function R_CinematicSetPalette(palette: Uint8Array | null): void {
  throw new PendingPort("R_CinematicSetPalette");
}

export function R_DrawBeam(e: EntityT): void {
  throw new PendingPort("R_DrawBeam");
}

export function R_SetSky(name: string, rotate: number, axis: Vec3): void {
  throw new PendingPort("R_SetSky");
}

export function Draw_GetPalette(): void {
  throw new PendingPort("Draw_GetPalette");
}

// this is the only function actually exported at the linker level in the
// C DLL (`typedef refexport_t (*GetRefAPI_t) (refimport_t);`); mirrors
// g_main.ts's GetGameAPI seam.
export function GetRefAPI(imp: RefImports): RefExports {
  SetRefImports(imp);

  return {
    api_version: API_VERSION,

    Init: (hinstance: unknown, wndproc: unknown) => R_Init(hinstance, wndproc),
    Shutdown: () => R_Shutdown(),

    BeginRegistration: (map: string) => R_BeginRegistration(map),
    RegisterModel: (name: string) => R_RegisterModel(name),
    RegisterSkin: (name: string) => R_RegisterSkin(name),
    RegisterPic: (name: string) => Draw_FindPic(name),
    SetSky: (name: string, rotate: number, axis) => R_SetSky(name, rotate, axis),
    EndRegistration: () => R_EndRegistration(),

    RenderFrame: (fd) => R_RenderFrame(fd),

    DrawGetPicSize: (name: string) => Draw_GetPicSize(name),
    DrawPic: (x: number, y: number, name: string) => Draw_Pic(x, y, name),
    DrawStretchPic: (x: number, y: number, w: number, h: number, name: string) => Draw_StretchPic(x, y, w, h, name),
    DrawChar: (x: number, y: number, c: number) => Draw_Char(x, y, c),
    DrawTileClear: (x: number, y: number, w: number, h: number, name: string) => Draw_TileClear(x, y, w, h, name),
    DrawFill: (x: number, y: number, w: number, h: number, c: number) => Draw_Fill(x, y, w, h, c),
    DrawFadeScreen: () => Draw_FadeScreen(),

    DrawStretchRaw: (x: number, y: number, w: number, h: number, cols: number, rows: number, data: Uint8Array) => Draw_StretchRaw(x, y, w, h, cols, rows, data),

    CinematicSetPalette: (palette) => R_CinematicSetPalette(palette),
    BeginFrame: (camera_separation) => R_BeginFrame(camera_separation),
    EndFrame: () => SWimp_EndFrame(),

    AppActivate: (activate: boolean) => SWimp_AppActivate(activate),
  };
}
