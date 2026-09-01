/*
Tests for src/client/qmenu.ts's MenusliderS.valueFormatter field and its
consumer, src/client/qmenu_impl.ts's Slider_Draw (QoL addition, Mike,
2026-09-01 -- see qmenu.ts's header comment on that field).

Self-sufficient per PORTING.md rule 13: installs its own fake RefExports via
setRe (src/client/client.ts) rather than relying on any renderer having been
constructed, and restores `re` to null in afterEach so this file's fake
never leaks into another test file's assertions. Verify with
`bun test test/qmenu_slider_readout.test.ts` alone.

Menu_Draw also draws a blinking cursor char (frame depends on
Sys_Milliseconds()), which would make the exact DrawChar call sequence
nondeterministic; every menu built here sets `menu.cursordraw` to a no-op to
strip that out and isolate Slider_Draw's own output.
*/

import { describe, test, expect, afterEach } from "bun:test";
import { setRe } from "../src/client/client";
import type { RefExports } from "../src/client/ref";
import { MenuframeworkS, MenusliderS, MTYPE_SLIDER } from "../src/client/qmenu";
import { Menu_AddItem, Menu_Draw } from "../src/client/qmenu_impl";

const RCOLUMN_OFFSET = 16;
const LCOLUMN_OFFSET = -16;
const SLIDER_RANGE = 10;

type DrawCharCall = { x: number; y: number; c: number };

function fakeRefExports(drawCharCalls: DrawCharCall[]): RefExports {
  return {
    api_version: 0,
    Init: () => true,
    Shutdown: () => undefined,
    BeginRegistration: () => undefined,
    RegisterModel: () => null,
    RegisterSkin: () => null,
    RegisterPic: () => null,
    SetSky: () => undefined,
    EndRegistration: () => undefined,
    RenderFrame: () => undefined,
    DrawGetPicSize: () => ({ w: 0, h: 0 }),
    DrawPic: () => undefined,
    DrawStretchPic: () => undefined,
    DrawChar: (x: number, y: number, c: number) => {
      drawCharCalls.push({ x, y, c });
    },
    DrawTileClear: () => undefined,
    DrawFill: () => undefined,
    DrawFadeScreen: () => undefined,
    DrawStretchRaw: () => undefined,
    CinematicSetPalette: () => undefined,
    BeginFrame: () => undefined,
    EndFrame: () => undefined,
    AppActivate: () => undefined,
  };
}

afterEach(() => {
  setRe(null);
});

// Reproduces Slider_Draw's own track/thumb math (qmenu_impl.ts) so this
// test can assert against hand-verified expected calls rather than just
// comparing two live runs against each other.
function expectedTrackCalls(s: MenusliderS, parentX: number, parentY: number): DrawCharCall[] {
  const calls: DrawCharCall[] = [];
  const name = s.generic.name ?? "";
  for (let i = 0; i < name.length; i++) {
    calls.push({ x: s.generic.x + parentX + LCOLUMN_OFFSET - i * 8, y: s.generic.y + parentY, c: name.charCodeAt(name.length - i - 1) + 128 });
  }

  let range = (s.curvalue - s.minvalue) / (s.maxvalue - s.minvalue);
  if (range < 0) range = 0;
  if (range > 1) range = 1;

  calls.push({ x: s.generic.x + parentX + RCOLUMN_OFFSET, y: s.generic.y + parentY, c: 128 });
  let i = 0;
  for (i = 0; i < SLIDER_RANGE; i++) {
    calls.push({ x: RCOLUMN_OFFSET + s.generic.x + i * 8 + parentX + 8, y: s.generic.y + parentY, c: 129 });
  }
  calls.push({ x: RCOLUMN_OFFSET + s.generic.x + i * 8 + parentX + 8, y: s.generic.y + parentY, c: 130 });
  calls.push({ x: 8 + RCOLUMN_OFFSET + parentX + s.generic.x + (SLIDER_RANGE - 1) * 8 * range, y: s.generic.y + parentY, c: 131 });
  return calls;
}

function buildMenuWithSlider(): { menu: MenuframeworkS; slider: MenusliderS } {
  const menu = new MenuframeworkS();
  menu.x = 100;
  menu.y = 50;
  menu.cursordraw = () => undefined; // strip the time-based blinking cursor char, see file header

  const slider = new MenusliderS();
  slider.generic.type = MTYPE_SLIDER;
  slider.generic.name = "test value";
  slider.generic.x = 0;
  slider.generic.y = 20;
  slider.minvalue = 0;
  slider.maxvalue = 10;
  slider.curvalue = 7;

  Menu_AddItem(menu, slider);
  return { menu, slider };
}

describe("MenusliderS.valueFormatter unset -- zero rendering change", () => {
  test("Slider_Draw's DrawChar sequence matches the pre-existing (formatter-less) track/thumb math exactly", () => {
    const calls: DrawCharCall[] = [];
    setRe(fakeRefExports(calls));

    const { menu, slider } = buildMenuWithSlider();
    expect(slider.valueFormatter).toBeNull();

    Menu_Draw(menu);

    const expected = expectedTrackCalls(slider, menu.x, menu.y);
    expect(calls).toEqual(expected);
  });
});

describe("MenusliderS.valueFormatter set -- readout drawn past the track, same row", () => {
  test("multi-word formatter output appends exactly one DrawChar per character, positioned past the track", () => {
    const calls: DrawCharCall[] = [];
    setRe(fakeRefExports(calls));

    const { menu, slider } = buildMenuWithSlider();
    slider.valueFormatter = () => "lowest (picmip 3)";

    Menu_Draw(menu);

    const baseline = expectedTrackCalls(slider, menu.x, menu.y);
    // every pre-existing call is unchanged, in the same order
    expect(calls.slice(0, baseline.length)).toEqual(baseline);

    const text = "lowest (picmip 3)";
    const trackWidth = (SLIDER_RANGE + 2) * 8;
    const startX = slider.generic.x + menu.x + RCOLUMN_OFFSET + trackWidth + 8;
    const extra = calls.slice(baseline.length);
    expect(extra.length).toBe(text.length);
    for (let i = 0; i < text.length; i++) {
      expect(extra[i]).toEqual({ x: startX + i * 8, y: slider.generic.y + menu.y, c: text.charCodeAt(i) });
    }
  });

  test("the exact scale-slider native-reference case: curvalue at max reads '1.00x (native)'", () => {
    const calls: DrawCharCall[] = [];
    setRe(fakeRefExports(calls));

    const { menu, slider } = buildMenuWithSlider();
    slider.minvalue = 1;
    slider.maxvalue = 10;
    slider.curvalue = 10;
    // mirrors src/platform/vid_menu.ts's ScaleFormatter: (curvalue/10).toFixed(2) + "x",
    // "(native)" appended at the slider's max (VID_SCALE_MAX * 10) -- verified
    // against the real formatter's output for this exact case in
    // test/vid_menu.test.ts. Reproduced locally here to keep this file
    // decoupled from src/platform/vid_menu.ts's own (heavier, SDL-adjacent)
    // import chain, per PORTING.md rule 13's self-sufficiency requirement.
    slider.valueFormatter = (curvalue: number) => {
      const scale = (curvalue / 10).toFixed(2);
      return curvalue >= 10 ? `${scale}x (native)` : `${scale}x`;
    };

    Menu_Draw(menu);

    const baseline = expectedTrackCalls(slider, menu.x, menu.y);
    const extra = calls.slice(baseline.length);
    const text = "1.00x (native)";
    expect(extra.length).toBe(text.length);
    const trackWidth = (SLIDER_RANGE + 2) * 8;
    const startX = slider.generic.x + menu.x + RCOLUMN_OFFSET + trackWidth + 8;
    for (let i = 0; i < text.length; i++) {
      expect(extra[i]).toEqual({ x: startX + i * 8, y: slider.generic.y + menu.y, c: text.charCodeAt(i) });
    }
  });

  test("no re (renderer) installed: every draw call is a silent no-op, formatter or not", () => {
    const { menu, slider } = buildMenuWithSlider();
    slider.valueFormatter = () => "should never render";
    expect(() => Menu_Draw(menu)).not.toThrow();
  });
});
