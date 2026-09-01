// Force headless SDL before ANY import can reach the FFI layer -- mirrors
// test/vid_modes.test.ts's own banner comment on why this must run first.
process.env.SDL_VIDEODRIVER = "dummy";
process.env.SDL_AUDIODRIVER = "dummy";
Bun.env.SDL_VIDEODRIVER = "dummy";
Bun.env.SDL_AUDIODRIVER = "dummy";

/*
Part G persistence audit: does the video-cvar family (vid_fullscreen,
gl_mode, sw_mode, r_customwidth, r_customheight, vid_scale, and the new
vid_scale_fit) actually round-trip through Cvar_WriteVariables (config.cfg)
and a fresh-boot re-exec?

The static-analysis half of this audit (registration flags at every
Cvar_Get call site, Cvar_WriteVariables' own body, boot-order force-set
grep) is reported in this unit's final report rather than re-derived here --
see that report for the one real gap found and fixed (src/platform/
vid_menu.ts's gl_mode/sw_mode were registered with flags 0, not
CVAR_ARCHIVE, when opened before either refresh's own R_Init had run this
session; both now pass CVAR_ARCHIVE, matching src/ref_gl/gl_rmain.ts's and
src/ref_soft/r_main.ts's own registrations of the same two cvars).

This file exercises the real registration functions (src/platform/vid.ts's
VID_Init -- registers vid_fullscreen/r_customwidth/r_customheight/
vid_scale/vid_scale_fit; src/platform/vid_menu.ts's VID_MenuInit --
registers gl_mode/sw_mode, the practical stand-in for ref_gl/ref_soft's own
R_Init in isolation, per this unit's brief) and then a real write/read/
re-apply cycle against a temp file, never inside the repo.

Self-sufficient per PORTING.md rule 13: verify with
`bun test test/vid_persistence.test.ts` alone.
*/

import { describe, test, expect, afterAll } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cvar_Get, Cvar_Set, Cvar_SetValue, Cvar_VariableValue, Cvar_VariableString, Cvar_WriteVariables } from "../src/qcommon/cvar";
import { CVAR_ARCHIVE } from "../src/shared/q_shared";
import { VID_Init } from "../src/platform/vid";
import { VID_MenuInit } from "../src/platform/vid_menu";

const SEVEN_CVARS = ["vid_fullscreen", "gl_mode", "sw_mode", "r_customwidth", "r_customheight", "vid_scale", "vid_scale_fit"] as const;

const tmpDir = mkdtempSync(join(tmpdir(), "q2ts-vid-persistence-"));
afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("video-cvar family registration -- every one of the seven carries CVAR_ARCHIVE", () => {
  test("VID_Init (vid.ts) + VID_MenuInit (vid_menu.ts) together register all seven with CVAR_ARCHIVE set", () => {
    VID_Init(); // vid_fullscreen, r_customwidth, r_customheight, vid_scale, vid_scale_fit
    VID_MenuInit(); // gl_mode, sw_mode (the practical stand-in for ref_gl/ref_soft's own R_Init -- see file header)

    for (const name of SEVEN_CVARS) {
      const v = Cvar_Get(name, null, 0); // flags=0 OR'd in is a no-op if ARCHIVE already set (see Cvar_Get's flag-merge semantics, src/qcommon/cvar.ts)
      expect(v).not.toBeNull();
      expect((v?.flags ?? 0) & CVAR_ARCHIVE).toBe(CVAR_ARCHIVE);
    }
  });
});

describe("Cvar_WriteVariables -- every one of the seven writes a `set <name> \"<value>\"` line", () => {
  test("modified values round-trip through a real write to a temp config file", () => {
    VID_Init();
    VID_MenuInit();

    // distinct, non-default values for all seven
    Cvar_SetValue("vid_fullscreen", 1); // default 0
    Cvar_SetValue("gl_mode", 7); // default 3
    Cvar_SetValue("sw_mode", 5); // default 0
    Cvar_SetValue("r_customwidth", 2560); // default 1920
    Cvar_SetValue("r_customheight", 1440); // default 1080
    Cvar_SetValue("vid_scale", 0.75); // default 1
    Cvar_SetValue("vid_scale_fit", 0); // default 1

    const expected = new Map(SEVEN_CVARS.map((name) => [name, Cvar_VariableValue(name)]));

    const path = join(tmpDir, "config-write.cfg");
    Cvar_WriteVariables(path);

    const written = readFileSync(path, "utf8");
    const lines = parseSetLines(written);

    for (const name of SEVEN_CVARS) {
      expect(lines.has(name)).toBe(true);
      expect(parseFloat(lines.get(name) ?? "")).toBeCloseTo(expected.get(name) ?? NaN, 6);
    }
  });

  test("a fresh-boot re-exec of the written file restores every value after they've been reset away", () => {
    VID_Init();
    VID_MenuInit();

    Cvar_SetValue("vid_fullscreen", 1);
    Cvar_SetValue("gl_mode", 9);
    Cvar_SetValue("sw_mode", 2);
    Cvar_SetValue("r_customwidth", 3440);
    Cvar_SetValue("r_customheight", 1440);
    Cvar_SetValue("vid_scale", 0.6);
    Cvar_SetValue("vid_scale_fit", 0);

    const expected = new Map(SEVEN_CVARS.map((name) => [name, Cvar_VariableString(name)]));

    const path = join(tmpDir, "config-reexec.cfg");
    Cvar_WriteVariables(path);

    // simulate the values NOT having survived a restart (e.g. defaults
    // reasserted by a fresh VID_Init/VID_MenuInit before config.cfg's own
    // "set" lines would normally re-run, matching src/main.ts's boot order:
    // "exec default.cfg" then "exec config.cfg" both happen before CL_Init
    // -> VID_Init in the real client -- see this file's header comment)
    Cvar_SetValue("vid_fullscreen", 0);
    Cvar_SetValue("gl_mode", 3);
    Cvar_SetValue("sw_mode", 0);
    Cvar_SetValue("r_customwidth", 1920);
    Cvar_SetValue("r_customheight", 1080);
    Cvar_SetValue("vid_scale", 1);
    Cvar_SetValue("vid_scale_fit", 1);

    // re-exec: parse the written "set <name> <value>" lines and re-apply
    // directly via Cvar_Set, the same effect running them through the
    // console's "set" command (Cvar_Set_f, src/qcommon/cvar.ts) would have.
    const written = readFileSync(path, "utf8");
    const lines = parseSetLines(written);
    for (const [name, value] of lines) {
      Cvar_Set(name, value);
    }

    for (const name of SEVEN_CVARS) {
      expect(Cvar_VariableString(name)).toBe(expected.get(name) ?? "");
    }
  });
});

// Parses Cvar_WriteVariables' own output format: `set <name> "<value>"\n`
// (src/qcommon/cvar.ts's `Com_sprintf('set %s "%s"\n', v.name, v.string)`).
function parseSetLines(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /^set (\S+) "([^"]*)"$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.set(m[1], m[2]);
  }
  return out;
}
