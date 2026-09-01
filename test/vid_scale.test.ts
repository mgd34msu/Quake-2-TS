/*
Tests for src/platform/vid_scale.ts's "scale to fullscreen" toggle additions
(Mike, 2026-09-01, cvar vid_scale_fit): VID_CalcCenteredRect,
VID_CalcBlitRect, VID_CalcOutputSize. Pure functions, no cvar/renderer state
involved -- no SDL dummy-driver banner needed (this file never imports
src/platform/sdl.ts transitively).

Styled after test/vid_modes.test.ts's own VID_CalcScaledRect describe block
(degenerate-input coverage, explicit named cases). Self-sufficient per
PORTING.md rule 13: verify with `bun test test/vid_scale.test.ts` alone.
*/

import { describe, test, expect } from "bun:test";
import { VID_CalcCenteredRect, VID_CalcBlitRect, VID_CalcOutputSize, VID_CalcScaledRect } from "../src/platform/vid_scale";

describe("VID_CalcCenteredRect -- 1:1 crisp pixels, centered, no stretch", () => {
  test("a render smaller than the display is centered with letterbox/pillarbox bars on both axes", () => {
    // owner's brief case: 720p rendered, 4K fullscreen display, fit OFF
    expect(VID_CalcCenteredRect(1280, 720, 3840, 2160)).toEqual({ x: 1280, y: 720, w: 1280, h: 720 });
  });

  test("a render exactly matching the display centers to x=0,y=0 (no bars)", () => {
    expect(VID_CalcCenteredRect(1920, 1080, 1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  test("a render larger than the display is centered with negative x/y (symmetric crop, not resized)", () => {
    const rect = VID_CalcCenteredRect(2560, 1440, 1920, 1080);
    expect(rect.w).toBe(2560); // never resizes the render's own size
    expect(rect.h).toBe(1440);
    expect(rect.x).toBe((1920 - 2560) / 2);
    expect(rect.y).toBe((1080 - 1440) / 2);
  });

  test("an odd centering offset floors rather than rounding or throwing", () => {
    const rect = VID_CalcCenteredRect(101, 101, 200, 200);
    expect(rect.x).toBe(Math.floor((200 - 101) / 2));
    expect(rect.y).toBe(Math.floor((200 - 101) / 2));
  });

  test("degenerate/zero-sized inputs fall back to the full destination rect instead of throwing or dividing by zero", () => {
    expect(() => VID_CalcCenteredRect(0, 0, 1920, 1080)).not.toThrow();
    expect(VID_CalcCenteredRect(0, 0, 1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(VID_CalcCenteredRect(1280, 720, 0, 0)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(VID_CalcCenteredRect(NaN, 720, 1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(VID_CalcCenteredRect(1280, 720, NaN, 1080)).toEqual({ x: 0, y: 0, w: 0, h: 1080 });
  });
});

describe("VID_CalcBlitRect -- single entry point, fit true/false dispatch", () => {
  test("fit=true matches VID_CalcScaledRect exactly (stretch-to-fill)", () => {
    expect(VID_CalcBlitRect(1280, 720, 1920, 1080, true)).toEqual(VID_CalcScaledRect(1280, 720, 1920, 1080));
  });

  test("fit=false matches VID_CalcCenteredRect exactly (1:1 crisp pixels)", () => {
    expect(VID_CalcBlitRect(1280, 720, 1920, 1080, false)).toEqual(VID_CalcCenteredRect(1280, 720, 1920, 1080));
  });

  test("the owner's fullscreen brief case: 720p render, 4K display -- fit ON fills the whole display", () => {
    expect(VID_CalcBlitRect(1280, 720, 3840, 2160, true)).toEqual({ x: 0, y: 0, w: 3840, h: 2160 });
  });

  test("the owner's fullscreen brief case: 720p render, 4K display -- fit OFF centers a crisp, unscaled 1280x720 rect", () => {
    expect(VID_CalcBlitRect(1280, 720, 3840, 2160, false)).toEqual({ x: 1280, y: 720, w: 1280, h: 720 });
  });
});

describe("VID_CalcOutputSize -- fullscreen output surface is the native display size, windowed is the mode size", () => {
  test("the owner's fullscreen brief case: mode 1280x720 + native display 3840x2160 -> output {3840,2160}", () => {
    expect(VID_CalcOutputSize(1280, 720, 3840, 2160, true)).toEqual({ width: 3840, height: 2160 });
  });

  test("windowed mode: output is the mode's own size regardless of the native display size", () => {
    expect(VID_CalcOutputSize(1280, 720, 3840, 2160, false)).toEqual({ width: 1280, height: 720 });
  });

  test("fullscreen with a degenerate/unknown native display size falls back to the mode size instead of 0x0", () => {
    expect(VID_CalcOutputSize(1280, 720, 0, 0, true)).toEqual({ width: 1280, height: 720 });
    expect(VID_CalcOutputSize(1280, 720, NaN, NaN, true)).toEqual({ width: 1280, height: 720 });
    expect(VID_CalcOutputSize(1280, 720, -1, 2160, true)).toEqual({ width: 1280, height: 720 });
  });

  test("fullscreen at a mode that exactly matches the native display is a no-op", () => {
    expect(VID_CalcOutputSize(3840, 2160, 3840, 2160, true)).toEqual({ width: 3840, height: 2160 });
  });

  test("fractional native display dimensions round to whole pixels", () => {
    expect(VID_CalcOutputSize(1280, 720, 1920.6, 1079.4, true)).toEqual({ width: 1921, height: 1079 });
  });
});
