// Force headless SDL before ANY import can reach the FFI layer -- mirrors
// test/vid_modes.test.ts's own banner comment on why this must run first.
// src/platform/vid_menu.ts's import chain pulls in src/client/client.ts ->
// ... -> src/platform/sdl.ts transitively, so this stays defensive insurance
// against ever opening a real window on the host.
process.env.SDL_VIDEODRIVER = "dummy";
process.env.SDL_AUDIODRIVER = "dummy";
Bun.env.SDL_VIDEODRIVER = "dummy";
Bun.env.SDL_AUDIODRIVER = "dummy";

/*
Tests for src/platform/vid_menu.ts's QoL additions (Mike, 2026-09-01):
  - Part B: live value-readout formatters for the four sliders on this menu
    (ScaleFormatter/ScreenSizeFormatter/BrightnessFormatter/
    TextureQualityFormatter), each mirroring the real cvar-write transform
    its slider's callback (or ApplyChanges, for the two that only commit on
    apply) performs.
  - Part C: the "scale to fullscreen" spincontrol (s_scale_fit_box, cvar
    vid_scale_fit) added next to the resolution-scale slider.
  - Part F: colloquial + aspect-ratio mode labels (VID_ResolutionLabel).

Per PORTING.md rule 13: self-sufficient, no reliance on any other test file
having run first. The cvar registry (src/qcommon/cvar.ts's cvar_vars map) is
a process-wide singleton shared with every other test file in a bun test
run (see test/vid_modes.test.ts's own note on this) -- every test that
depends on a specific cvar-derived value sets it explicitly via Cvar_Set/
Cvar_SetValue immediately before exercising VID_MenuInit, rather than
assuming a cold-registration default. Verify with
`bun test test/vid_menu.test.ts` alone.
*/

import { describe, test, expect, afterEach } from "bun:test";
import { Cvar_Set, Cvar_SetValue } from "../src/qcommon/cvar";
import {
  VID_MenuInit,
  VID_MenuScaleFitValue,
  ScaleFormatter,
  ScreenSizeFormatter,
  BrightnessFormatter,
  TextureQualityFormatter,
  VID_ResolutionLabel,
} from "../src/platform/vid_menu";

// Restore every cvar this file mutates back to its production default so a
// later test file (in the same bun test process) sees the values it
// expects -- same hygiene as test/vid_modes.test.ts's afterEach.
afterEach(() => {
  Cvar_Set("vid_scale_fit", "1");
  Cvar_SetValue("vid_scale", 1);
  Cvar_SetValue("vid_gamma", 1);
  Cvar_SetValue("viewsize", 100);
});

describe("ScaleFormatter (s_scale_slider, minvalue=1 maxvalue=10, cvar vid_scale = curvalue/10)", () => {
  test.each([
    [1, "0.10x"],
    [5, "0.50x"],
    [10, "1.00x (native)"], // VID_SCALE_MAX (1.0) reference point
  ])("curvalue %i -> %s", (curvalue, expected) => {
    expect(ScaleFormatter(curvalue)).toBe(expected);
  });
});

describe("ScreenSizeFormatter (s_screensize_slider, minvalue=3 maxvalue=12, cvar viewsize = curvalue*10)", () => {
  test.each([
    [3, "30%"],
    [10, "100%"],
    [12, "120%"],
  ])("curvalue %i -> %s", (curvalue, expected) => {
    expect(ScreenSizeFormatter(curvalue)).toBe(expected);
  });
});

describe("BrightnessFormatter (s_brightness_slider, minvalue=5 maxvalue=13, gamma = 1.8 - curvalue/10)", () => {
  test.each([
    [5, "1.30"],
    [8, "1.00"], // default vid_gamma=1 maps to curvalue 8 in VID_MenuInit
    [13, "0.50"],
  ])("curvalue %i -> %s", (curvalue, expected) => {
    expect(BrightnessFormatter(curvalue)).toBe(expected);
  });
});

describe("TextureQualityFormatter (s_tq_slider, minvalue=0 maxvalue=3, cvar gl_picmip = 3 - curvalue)", () => {
  test.each([
    [0, "lowest (picmip 3)"],
    [1, "low (picmip 2)"],
    [2, "medium (picmip 1)"],
    [3, "high (picmip 0)"], // native/max texture quality
  ])("curvalue %i -> %s", (curvalue, expected) => {
    expect(TextureQualityFormatter(curvalue)).toBe(expected);
  });
});

describe("s_scale_fit_box (\"scale to fullscreen\") default curvalue", () => {
  test("VID_MenuInit reflects a registered vid_scale_fit=1 (production default) as curvalue 1 (\"fit screen\")", () => {
    // Mirrors real boot order: vid.ts's VID_Init eagerly registers
    // vid_scale_fit="1" (CVAR_ARCHIVE) long before the player can ever reach
    // this menu -- see this file's header comment and vid.ts's VID_GetScaleFit.
    Cvar_Set("vid_scale_fit", "1");
    VID_MenuInit();
    expect(VID_MenuScaleFitValue()).toBe(1);
  });

  test("a vid_scale_fit=0 cvar reflects as curvalue 0 (\"1:1 pixels\")", () => {
    Cvar_Set("vid_scale_fit", "0");
    VID_MenuInit();
    expect(VID_MenuScaleFitValue()).toBe(0);
  });

  test("any nonzero vid_scale_fit value reflects as curvalue 1 (boolean coercion, not raw passthrough)", () => {
    Cvar_SetValue("vid_scale_fit", 2);
    VID_MenuInit();
    expect(VID_MenuScaleFitValue()).toBe(1);
  });
});

describe("VID_ResolutionLabel -- colloquial + aspect-ratio mode labels (Part F)", () => {
  test.each([
    [1280, 720, "1280x720 (720p, 16:9)"],
    [1920, 1080, "1920x1080 (1080p, 16:9)"],
    [2560, 1440, "2560x1440 (1440p, 16:9)"],
    [3840, 2160, "3840x2160 (2160p, 16:9)"],
    [1920, 1200, "1920x1200 (16:10)"], // exact 8:5, canonicalized
    [1366, 768, "1366x768 (16:9)"], // tolerance case: 1.7786 vs 16/9's 1.7778
    [2560, 1080, "2560x1080 (21:9)"], // ultrawide marketing special-case (true ratio 64:27)
    [3440, 1440, "3440x1440 (21:9)"], // ultrawide marketing special-case (true ratio 43:18)
    [640, 480, "640x480 (4:3)"], // plain GCD reduction, no tolerance needed
  ])("%ix%i -> %s", (w, h, expected) => {
    expect(VID_ResolutionLabel(w, h)).toBe(expected);
  });

  test("never invents a colloquial name beyond the four in the table", () => {
    expect(VID_ResolutionLabel(1600, 900)).toBe("1600x900 (16:9)"); // not "HD+"
    expect(VID_ResolutionLabel(2048, 1536)).toBe("2048x1536 (4:3)"); // not "QXGA"
  });
});
