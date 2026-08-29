/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_rmain.c (GNU GPL v2 or later) -- pending. Every
function gl_local.h attributes to gl_rmain.c throws PendingPort, EXCEPT
GetRefAPI: that seam has to exist and return a real RefExports object today
so src/client (and this unit's own test) has something to construct/call,
exactly the way ref_soft/r_main.ts's GetRefAPI does for the software
renderer (see that file's identical header comment) and g_main.ts's
GetGameAPI does for the game track. Calling any of the RefExports methods
still throws PendingPort -- only the wiring itself is real.

Internal helpers not declared in gl_local.h (R_Clear, GL_Strings_f,
R_SetFrustum, R_SetupFrame, MYgluPerspective, R_SetupGL, R_Flash, R_SetGL2D,
R_SetLightLevel, R_Register, R_SetMode, SignbitsForPlane, R_DrawNullModel,
R_DrawEntitiesOnList, R_DrawParticles, R_PolyBlend) are not stubbed
individually, per this unit's brief.

`R_SwapBuffers` is declared in gl_local.h but (confirmed by grepping the
full ref_gl tree) is never defined in any gl_*.c file -- it is implemented
per-platform (linux/gl_glx.c et al, alongside the GLimp_* family). Per
PORTING.md's platform mapping that belongs in a future src/platform/
GL-context module, not here; not stubbed, reported as a gap. `EndFrame`/
`AppActivate` on RefExports are wired to `GLimp_EndFrame`/`GLimp_AppActivate`
in the original (also platform-specific, also not yet ported by the live
sibling unit owning src/platform/**) -- this file provides its own pending
placeholders for both rather than importing from src/platform (out of this
unit's SCOPE), reported as the same follow-up.
*/

import type { RefExports, RefImports, EntityT, RefdefT, ParticleT } from "../client/ref";
import { API_VERSION } from "../client/ref";
import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import { SetRefImports } from "./gl_local";
import { R_BeginRegistration, R_EndRegistration, R_RegisterModel } from "./gl_model";
import { R_RegisterSkin } from "./gl_image";
import { Draw_Char, Draw_Fill, Draw_FadeScreen, Draw_FindPic, Draw_GetPicSize, Draw_Pic, Draw_StretchPic, Draw_StretchRaw, Draw_TileClear } from "./gl_draw";
import { R_SetSky } from "./gl_warp";

export function R_CullBox(mins: Vec3, maxs: Vec3): boolean {
  throw new PendingPort("R_CullBox");
}

export function R_RotateForEntity(e: EntityT): void {
  throw new PendingPort("R_RotateForEntity");
}

export function R_DrawSpriteModel(e: EntityT): void {
  throw new PendingPort("R_DrawSpriteModel");
}

export function GL_DrawParticles(particles: readonly ParticleT[], colortable: Uint32Array): void {
  throw new PendingPort("GL_DrawParticles");
}

export function R_RenderView(fd: RefdefT): void {
  throw new PendingPort("R_RenderView");
}

export function R_RenderFrame(fd: RefdefT): void {
  throw new PendingPort("R_RenderFrame");
}

export function R_Init(hInstance: unknown, wndProc: unknown): boolean {
  throw new PendingPort("R_Init");
}

export function R_Shutdown(): void {
  throw new PendingPort("R_Shutdown");
}

export function R_BeginFrame(camera_separation: number): void {
  throw new PendingPort("R_BeginFrame");
}

export function R_SetPalette(palette: Uint8Array | null): void {
  throw new PendingPort("R_SetPalette");
}

export function R_DrawBeam(e: EntityT): void {
  throw new PendingPort("R_DrawBeam");
}

// GLimp_EndFrame/GLimp_AppActivate are what the original wires RefExports'
// EndFrame/AppActivate to -- see this file's header comment for why they
// are not reached from here yet.
function pendingEndFrame(): void {
  throw new PendingPort("GLimp_EndFrame");
}

function pendingAppActivate(activate: boolean): void {
  throw new PendingPort("GLimp_AppActivate");
}

// this is the only function actually exported at the linker level in the
// C DLL (`typedef refexport_t (*GetRefAPI_t) (refimport_t);`); mirrors
// r_main.ts's GetRefAPI (ref_soft) and g_main.ts's GetGameAPI (game).
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
    SetSky: (name: string, rotate: number, axis: Vec3) => R_SetSky(name, rotate, axis),
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

    CinematicSetPalette: (palette) => R_SetPalette(palette),
    BeginFrame: (camera_separation) => R_BeginFrame(camera_separation),
    EndFrame: () => pendingEndFrame(),

    AppActivate: (activate: boolean) => pendingAppActivate(activate),
  };
}
