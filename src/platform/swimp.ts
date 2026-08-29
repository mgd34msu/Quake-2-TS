/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from null/swimp_null.c (GNU GPL v2 or later), grown into a real
headless implementation per PORTING.md's platform-track rule ("linux/
win32/... -> src/platform/ -- ONE bun implementation of the sys/net/vid/snd
interfaces"): there is no window, no X11/DIB surface, and no display to
blit to, so SWimp_SetMode allocates `vid.buffer` directly instead of
wrapping a native framebuffer (see linux/rw_x11.c's ResetFrameBuffer/
SWimp_InitGraphics for the windowed equivalent this replaces) and
SWimp_EndFrame does nothing -- `vid.buffer` already *is* the rendered
frame, there is nothing to present it to.
*/

import { RserrT, ri, sw_state, vid } from "../ref_soft/r_local";

// The real linux/rw_x11.c SWimp_SetMode ends by calling
// R_GammaCorrectAndSetPalette(d_8to24table) to push the mode's palette to
// the (real) display. r_main.ts's R_GammaCorrectAndSetPalette is a
// PendingPort stub (r_main.c is out of this unit's scope), and there is no
// display here to push to regardless -- wiring the call in would make
// every SetMode call throw, so it is dropped. Reported deviation.

export function SWimp_Init(hInstance: unknown, wndProc: unknown): number {
  return 1; // true: nothing to initialize headlessly
}

export function SWimp_SetMode(width: number, height: number, mode: number, fullscreen: boolean): { pwidth: number; pheight: number; rserr: RserrT } {
  ri.Con_Printf(0, `setting mode ${mode}:`);

  const info = ri.Vid_GetModeInfo(mode);
  if (!info) {
    ri.Con_Printf(0, " invalid mode\n");
    return { pwidth: width, pheight: height, rserr: RserrT.rserr_invalid_mode };
  }

  ri.Con_Printf(0, ` ${info.width} ${info.height}\n`);

  vid.width = info.width;
  vid.height = info.height;
  vid.rowbytes = info.width;
  vid.buffer = new Uint8Array(info.width * info.height);

  return { pwidth: info.width, pheight: info.height, rserr: RserrT.rserr_ok };
}

// A NULL palette means to use the existing palette. The palette is
// expected to be in a padded 4-byte xRGB format (256 * 4 bytes).
export function SWimp_SetPalette(palette: Uint8Array | null): void {
  const pal = palette ?? sw_state.currentpalette;
  sw_state.currentpalette.set(pal.subarray(0, 1024));
}

export function SWimp_Shutdown(): void {
  vid.buffer = new Uint8Array(0);
  vid.width = 0;
  vid.height = 0;
  vid.rowbytes = 0;
}

export function SWimp_BeginFrame(camera_separation: number): void {
  // nothing to do headlessly -- no window to (re)acquire per frame
}

export function SWimp_EndFrame(): void {
  // no-op: vid.buffer is the rendered frame, not a backbuffer to blit
  // from -- there is no display to present it to.
}

export function SWimp_AppActivate(active: boolean): void {
  // no-op: no window to (de)activate headlessly
}
