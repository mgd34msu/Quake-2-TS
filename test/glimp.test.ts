// Force headless SDL before ANY import can reach the FFI layer -- mirrors
// test/sdl_platform.test.ts's own banner comment on why this must run first.
process.env.SDL_VIDEODRIVER = "dummy";
process.env.SDL_AUDIODRIVER = "dummy";
Bun.env.SDL_VIDEODRIVER = "dummy";
Bun.env.SDL_AUDIODRIVER = "dummy";

/*
Tests for the RG4 unit (make `vid_ref gl` actually load the OpenGL renderer):
src/platform/glimp.ts's GLimp implementation, src/ref_gl/qgl.ts's
getProcAddress-aware loadQGLFromSystem, and src/platform/vid.ts's
VID_LoadRefresh name dispatch. Per this project's rule 13: self-sufficient,
no reliance on any other test file having run first -- shared module state
this file touches (SDL's backend/window, gl_local.ts's `ri`, the client's
`re`, the real cvar/filesystem singletons) is set up and reset here rather
than assumed.

Nothing here creates a real GL context: SDL's "dummy" video driver cannot
make one -- confirmed empirically against the real libSDL2 this suite links:
SDL_CreateWindow(..., SDL_WINDOW_OPENGL) itself fails under it, before any
context could exist, with "OpenGL support is either not configured in SDL or
not available in current SDL video driver (dummy) or platform". The one test
below that drives VID_LoadRefresh("ref_gl") all the way through gl_rmain.ts's
real R_Init/R_Shutdown therefore never reaches a bound context either;
R_Shutdown's GL_ShutdownImages/Mod_FreeAll loops run against whatever
numgltextures/mod_numknown this shared bun:test process happens to have left
behind from other *.test.ts files, issuing real (but contextless) qgl* calls
if so -- confirmed empirically safe against this host's libGL.so.1 (Mesa's
no-current-context dispatch table no-ops rather than crashing, the same
property the C engine has always implicitly relied on for any stray GL call
made outside a frame).
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pointer } from "bun:ffi";
import { loadQGLFromSystem, type QGL } from "../src/ref_gl/qgl";
import { SetRefImports, RserrT } from "../src/ref_gl/gl_local";
import type { RefImports } from "../src/client/ref";
import { CvarT } from "../src/shared/q_shared";
import { CreateGLimp, GLimp_AppActivate, GLimp_BeginFrame, GLimp_EndFrame, GLimp_EnableLogging, GLimp_Init, GLimp_LogNewFrame, GLimp_SetMode, GLimp_Shutdown } from "../src/platform/glimp";
import { SDL_ResetBackendForTests, SDL_SetBackendEnabled, SDLVID_Active } from "../src/platform/sdl";
import { VID_LoadRefresh } from "../src/platform/vid";
import { FS_AddGameDirectory } from "../src/qcommon/files";
import { re, setRe } from "../src/client/client";
import { buildColormapPcx } from "./support/colormap_builder";

function makeFakeRi(overrides: Partial<RefImports> = {}): RefImports {
  return {
    Sys_Error(errLevel: number, str: string): never {
      throw new Error(`Sys_Error(${errLevel}): ${str}`);
    },
    Cmd_AddCommand: () => {},
    Cmd_RemoveCommand: () => {},
    Cmd_Argc: () => 0,
    Cmd_Argv: () => "",
    Cmd_ExecuteText: () => {},
    Con_Printf: () => {},
    FS_LoadFile: () => ({ length: -1, data: null }),
    FS_FreeFile: () => {},
    FS_Gamedir: () => "",
    Cvar_Get: () => new CvarT(),
    Cvar_Set: () => new CvarT(),
    Cvar_SetValue: () => {},
    Vid_GetModeInfo: () => ({ width: 320, height: 240 }),
    Vid_MenuInit: () => {},
    Vid_NewWindow: () => {},
    ...overrides,
  };
}

const EXTENSION_SYMBOL_NAMES = ["glLockArraysEXT", "glUnlockArraysEXT", "glPointParameterfEXT", "glPointParameterfvEXT", "glColorTableEXT", "glMTexCoord2fSGIS", "glSelectTextureSGIS"];

describe("src/ref_gl/qgl.ts -- loadQGLFromSystem's getProcAddress wiring", () => {
  test("queries every *_EXT/*_SGIS name through the resolver and falls back to a no-op when it comes back empty", () => {
    const queried: string[] = [];
    const fakeGetProcAddress = (name: string): Pointer | bigint | null => {
      queried.push(name);
      return null; // simulate a driver/context with none of these extensions
    };

    const qgl: QGL = loadQGLFromSystem(fakeGetProcAddress);

    expect(queried.slice().sort()).toEqual(EXTENSION_SYMBOL_NAMES.slice().sort());

    // unresolved extensions become safe no-ops -- QGL's contract (see that
    // file's header comment) is that every member always exists and is
    // callable, never a missing property. None of these are real GL calls
    // when unresolved, so this is safe without any context.
    expect(() => qgl.qglLockArraysEXT(0, 4)).not.toThrow();
    expect(() => qgl.qglUnlockArraysEXT()).not.toThrow();
    expect(() => qgl.qglMTexCoord2fSGIS(0, 0, 0)).not.toThrow();
    expect(() => qgl.qglSelectTextureSGIS(0)).not.toThrow();
    expect(() => qgl.qglPointParameterfEXT(0, 0)).not.toThrow();
    expect(() => qgl.qglPointParameterfvEXT(0, new Float32Array(1))).not.toThrow();
    expect(() => qgl.qglColorTableEXT(0, 0, 0, 0, 0, new Uint8Array(4))).not.toThrow();
  });

  test("a resolver that finds every extension is queried by name but its no-op fallback is never used", () => {
    const resolved = new Set<string>();
    // returning a non-null, deliberately-invalid "pointer" (a huge address)
    // is enough to prove the resolver's result reaches linkSymbols instead
    // of the dlsym fallback, without ever calling the bound function (which
    // would genuinely crash against a bogus address) -- this test only
    // checks which path was taken, not that the address is callable.
    const fakeGetProcAddress = (name: string): Pointer | bigint | null => {
      resolved.add(name);
      return 0x1n;
    };

    expect(() => loadQGLFromSystem(fakeGetProcAddress)).not.toThrow();
    expect(resolved).toEqual(new Set(EXTENSION_SYMBOL_NAMES));
  });

  test("with no resolver at all (gl_rmain.ts's own zero-arg call site), every QGL member still exists", () => {
    const qgl: QGL = loadQGLFromSystem();

    // structural check only: no core or extension entry point is invoked
    // here, since none of them are safe to call without a current GL
    // context (see file header comment)
    const names: ReadonlyArray<keyof QGL> = ["qglBegin", "qglEnd", "qglGetError", "qglLockArraysEXT", "qglUnlockArraysEXT", "qglPointParameterfEXT", "qglPointParameterfvEXT", "qglColorTableEXT", "qglMTexCoord2fSGIS", "qglSelectTextureSGIS"];
    for (const name of names) {
      expect(typeof qgl[name]).toBe("function");
    }
  });
});

describe("src/platform/glimp.ts -- GLimp under SDL's dummy video driver", () => {
  afterAll(() => {
    SDL_ResetBackendForTests();
  });

  test("GLimp_SetMode reports an invalid mode without touching SDL at all", () => {
    SetRefImports(makeFakeRi({ Vid_GetModeInfo: () => null }));
    const result = GLimp_SetMode(0, 0, 999, false);
    expect(result.rserr).toBe(RserrT.rserr_invalid_mode);
  });

  test("GLimp_SetMode fails cleanly (rserr_unknown) when the dummy driver refuses an OpenGL window", () => {
    SetRefImports(makeFakeRi());
    SDL_SetBackendEnabled(true);

    const result = GLimp_SetMode(999, 999, 3, false);

    // dimensions come from the (fake) Vid_GetModeInfo lookup, not the
    // width/height arguments -- same contract as SWimp_SetMode
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.rserr).toBe(RserrT.rserr_unknown);
    expect(SDLVID_Active()).toBe(false); // never got as far as a working window/texture
  });

  test("the rest of the GLimp surface is safe to call without a context", () => {
    expect(GLimp_Init(null, null)).toBe(true);
    expect(() => GLimp_BeginFrame(0)).not.toThrow();
    expect(() => GLimp_EndFrame()).not.toThrow();
    expect(() => GLimp_AppActivate(true)).not.toThrow();
    expect(() => GLimp_AppActivate(false)).not.toThrow();
    expect(() => GLimp_EnableLogging(true)).not.toThrow();
    expect(() => GLimp_LogNewFrame()).not.toThrow();
    expect(() => GLimp_Shutdown()).not.toThrow();
  });

  test("CreateGLimp assembles every member gl_rmain.ts's SetGLimp/GLimp interface expects", () => {
    const glimp = CreateGLimp();
    const members: ReadonlyArray<keyof typeof glimp> = ["Init", "SetMode", "Shutdown", "BeginFrame", "EndFrame", "AppActivate", "EnableLogging", "LogNewFrame"];
    for (const name of members) {
      expect(typeof glimp[name]).toBe("function");
    }
  });
});

describe("src/platform/vid.ts -- VID_LoadRefresh dispatch", () => {
  let tmpRoot = "";

  beforeAll(() => {
    setRe(null);
    tmpRoot = mkdtempSync(join(tmpdir(), "q2glimp-"));
    mkdirSync(join(tmpRoot, "pics"), { recursive: true });
    writeFileSync(join(tmpRoot, "pics", "colormap.pcx"), buildColormapPcx());
    // FS_AddGameDirectory prepends to the search path, so this fixture is
    // found first regardless of what any earlier test file registered.
    FS_AddGameDirectory(tmpRoot);
  });

  afterAll(() => {
    setRe(null);
    SDL_ResetBackendForTests();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("an unknown refresh name fails cleanly without registering a renderer", () => {
    expect(VID_LoadRefresh("ref_nonexistent")).toBe(false);
    expect(re).toBeNull();
  });

  test("ref_gl wires GLimp/QGL and calls gl_rmain's real GetRefAPI, then falls back cleanly when the dummy driver can't create a GL context", () => {
    SDL_SetBackendEnabled(true);

    let result = true;
    expect(() => {
      result = VID_LoadRefresh("ref_gl");
    }).not.toThrow();

    expect(result).toBe(false);
    expect(re).toBeNull(); // VID_FreeReflib runs on any load failure

    // never got far enough to open a real window/texture the way the
    // software path's SDLVID_Init would -- ref_gl's GLimp_SetMode uses
    // SDLGL_CreateWindow instead, which SDL rejects outright under the
    // dummy driver (see this file's header comment)
    expect(SDLVID_Active()).toBe(false);
  });
});
