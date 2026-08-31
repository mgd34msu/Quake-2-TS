// Force headless SDL before ANY import can reach the FFI layer (see
// test/sdl_platform.test.ts's identical header comment): sdl.ts dlopen()s
// lazily, so as long as no SDL entry point is called above this assignment,
// SDL reads these on its first SDL_Init.
process.env.SDL_VIDEODRIVER = "dummy";
process.env.SDL_AUDIODRIVER = "dummy";
Bun.env.SDL_VIDEODRIVER = "dummy";
Bun.env.SDL_AUDIODRIVER = "dummy";

/*
Command parity audit: every `Cmd_AddCommand(` registration site in the
reference C engine's client/, server/, qcommon/, ref_gl/, ref_soft/, win32/,
and linux/ sources (game/ and its mission-pack siblings are a separate
porting track -- game commands flow through ClientCommand and are ported
there, not here) has a matching registration in this port. MANIFEST below
is the hand-audited list of every one of those command names, taken
straight from the C call sites (file:line noted per group).

Companion to test/cvar_parity.test.ts (same audit methodology, same repo
ruling: "not just cvars, but all console commands"). Where the C registers
the same name from more than one call site -- a cross-platform command
re-Cmd_AddCommand'd by a later, platform-specific module, or a name gated
behind `dedicated->value` at one site and always-on at another -- MANIFEST
lists it once, with every citing site noted in the comment. This port takes
the client (dedicated 0) boot path (see src/main.ts's header comment), so
any command whose ONLY C site is `if (dedicated->value) Cmd_AddCommand(...)`
is exercised here through its always-on sibling instead (see "quit" and
"say" below) -- both names are still asserted for real, just via the
registration site this boot order actually reaches.

Three commands are registered with a stub handler instead of a ported one,
because the feature they control is genuinely absent from this port (the
same buckets test/cvar_parity.test.ts's MANIFEST already excuses for their
cvars): z_stats (no zone allocator -- plain GC-managed allocation),
joy_advancedupdate (no joystick backend), and three of "cd"'s twelve
subcommands (remap/close/eject/pause -- no physical CD-ROM device). These
are still asserted for existence like everything else; only their observable
behaviour differs (a console message explaining why, instead of the C
action).

This test drives the real subsystem init entry points (see beforeAll)
rather than re-registering commands itself, so a regression that deletes a
Cmd_AddCommand call in production code actually fails this suite.
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RefImports } from "../src/client/ref";
import { CvarT } from "../src/shared/q_shared";
import { Cvar_ForceSet, Cvar_Get, Cvar_Set } from "../src/qcommon/cvar";
import { CM_LoadMap } from "../src/qcommon/cmodel";
import { FS_LoadFile, FS_FreeFile, FS_Gamedir } from "../src/qcommon/files";
import { Cmd_AddCommand, Cmd_RemoveCommand, Cmd_Argc, Cmd_Argv, Cmd_Exists } from "../src/qcommon/cmd";
import { Qcommon_Init } from "../src/main";
import { NET_Config, NET_ClearLoopback, NET_Shutdown } from "../src/platform/net_udp";
import { SetRefImports as GlSetRefImports } from "../src/ref_gl/gl_local";
import { R_Register } from "../src/ref_gl/gl_rmain";
import { GL_InitImages, SetQGL } from "../src/ref_gl/gl_image";
import { QGLRecording } from "../src/ref_gl/qgl";
import { VID_MenuInit } from "../src/platform/vid_menu";
import { SDL_ResetBackendForTests } from "../src/platform/sdl";
import { setNostdout } from "../src/platform/sys";
import { SV_Shutdown } from "../src/server/sv_main";
import { setRe } from "../src/client/client";
import { buildColormapPcx } from "./support/colormap_builder";

const MANIFEST: string[] = [
  // client/cl_input.c:409-441 (src/client/cl_input.ts, IN_Init/CL_InitLocal
  // registration block)
  "centerview",
  "+moveup", "-moveup", "+movedown", "-movedown",
  "+left", "-left", "+right", "-right",
  "+forward", "-forward", "+back", "-back",
  "+lookup", "-lookup", "+lookdown", "-lookdown",
  "+strafe", "-strafe", "+moveleft", "-moveleft", "+moveright", "-moveright",
  "+speed", "-speed", "+attack", "-attack", "+use", "-use",
  "impulse", "+klook", "-klook",

  // client/cl_view.c:570-574 (src/client/cl_view.ts)
  "gun_next", "gun_prev", "gun_model", "viewpos",

  // client/cl_scrn.c:427-431 (src/client/cl_scrn.ts)
  "timerefresh", "loading", "sizeup", "sizedown", "sky",

  // client/snd_dma.c:135-138 (src/client/snd_dma.ts)
  "play", "stopsound", "soundlist", "soundinfo",

  // client/cl_main.c:1492-1544, CL_InitLocal (src/client/cl_main.ts). Line
  // 1512's `Cmd_AddCommand ("packet", CL_Packet_f)` is commented out in the
  // C source itself ("this is dangerous to leave in") and is mirrored the
  // same way in cl_main.ts -- excluded here, on purpose, on both sides.
  "cmd", "pause", "pingservers", "skins", "userinfo", "snd_restart",
  "changing", "disconnect", "record", "stop",
  // "quit"'s only OTHER C site is qcommon/common.c:1458, gated behind
  // `if (dedicated->value)` -- this suite boots with dedicated 0, so it is
  // this cl_main.c:1505 site (always-on) that is actually exercised. Both
  // sites are still real registrations in src/main.ts / src/client/cl_main.ts.
  "quit",
  "connect", "reconnect", "rcon", "setenv", "precache", "download",
  // forward-to-server placeholders (Cmd_AddCommand(name, NULL) in C):
  "wave", "inven", "kill", "use", "drop",
  // "say"'s other C site is server/sv_ccmds.c:1038, gated behind
  // `if (dedicated->value)` -- see the server group below for the same
  // dedicated/always-on split as "quit" above.
  "say",
  "say_team", "info", "prog", "give", "god", "notarget", "noclip",
  "invuse", "invprev", "invnext", "invdrop", "weapnext", "weapprev",

  // client/keys.c:726-729 (src/client/keys_impl.ts)
  "bind", "unbind", "unbindall", "bindlist",

  // client/menu.c:3951-3966 (src/client/menu.ts)
  "menu_main", "menu_game", "menu_loadgame", "menu_savegame",
  "menu_joinserver", "menu_addressbook", "menu_startserver", "menu_dmoptions",
  "menu_playerconfig", "menu_downloadoptions", "menu_credits",
  "menu_multiplayer", "menu_video", "menu_options", "menu_keys", "menu_quit",

  // client/console.c:317-322 (src/client/console_impl.ts)
  "toggleconsole", "togglechat", "messagemode", "messagemode2", "clear", "condump",

  // qcommon/files.c:843-845 (src/qcommon/files.ts)
  "path", "link", "dir",

  // qcommon/cvar.c:524-525 (src/qcommon/cvar.ts)
  "set", "cvarlist",

  // qcommon/cmd.c:886-890 (src/qcommon/cmd.ts, Cmd_Init)
  "cmdlist", "exec", "echo", "alias", "wait",

  // qcommon/common.c:1437-1438 (src/main.ts, Qcommon_Init). "error" is a
  // real port of Com_Error_f; "z_stats" is a stub -- see file header.
  "z_stats", "error",

  // ref_soft/r_main.c:276-278 and ref_gl/gl_rmain.c:1039-1042 register the
  // same three names (modellist/screenshot/imagelist) from whichever
  // renderer is active, plus ref_gl's own gl_strings. This suite's boot
  // exercises ref_soft's site for real (vid_ref defaults to "soft"); the
  // ref_gl site (including gl_strings, which has no ref_soft counterpart)
  // is driven directly in beforeAll, same as test/cvar_parity.test.ts does
  // for its cvars.
  "modellist", "screenshot", "imagelist", "gl_strings",

  // server/sv_ccmds.c:1026-1048 (src/server/sv_ccmds.ts, SV_InitOperatorCommands)
  "heartbeat", "kick", "status", "serverinfo", "dumpuser",
  "map", "demomap", "gamemap", "setmaster",
  "serverrecord", "serverstop", "save", "load", "killserver", "sv",

  // win32/vid_dll.c:719-720 (src/platform/vid.ts); linux/vid_so.c:407 only
  // registers vid_restart, not vid_front -- this port registers the union.
  "vid_restart", "vid_front",

  // win32/cd_win.c:477, linux/cd_linux.c:398 (src/platform/cd_ogg.ts,
  // CDAudio_Init). Ported for real (play/loop/stop/resume/info map onto the
  // OGG-file backend, on/off/reset onto cd_nocd); remap/close/eject/pause
  // print a stub message -- see cd_ogg.ts's CD_f header comment. Only
  // registered once CDAudio_Init's device probe succeeds, exactly like the
  // C sites -- this suite's environment has libvorbisfile installed.
  "cd",

  // win32/in_win.c:377-378, linux/rw_in_svgalib.c:246-247, linux/rw_x11.c:148-149
  // (src/platform/sdl.ts, IN_Init)
  "+mlook", "-mlook",

  // win32/in_win.c:380 (src/platform/sdl.ts) -- stub, no joystick backend
  "joy_advancedupdate",

  // linux/rw_in_svgalib.c:249, linux/rw_x11.c:151 (src/platform/sdl.ts) --
  // ported for real (plain viewangles[PITCH] = 0 write, no hardware tie)
  "force_centerview",
];

// RefImports stub for src/ref_gl/gl_rmain.ts's R_Register and
// src/ref_gl/gl_image.ts's GL_InitImages: Cmd_AddCommand/Cmd_RemoveCommand
// are the real qcommon/cmd.ts functions (unlike test/cvar_parity.test.ts's
// otherwise-identical stub, which no-ops them -- this suite needs
// gl_strings to land in the real registry), so is Cvar_Get/FS_LoadFile
// (same registries every other subsystem here reads/writes through).
// Everything else is a no-op stand-in for the window/menu plumbing neither
// function touches.
const glRefImports: RefImports = {
  Sys_Error(errLevel: number, str: string): never {
    throw new Error(`Sys_Error(${errLevel}): ${str}`);
  },
  Cmd_AddCommand,
  Cmd_RemoveCommand,
  Cmd_Argc,
  Cmd_Argv,
  Cmd_ExecuteText: () => {},
  Con_Printf: () => {},
  FS_LoadFile: (name: string) => {
    const data = FS_LoadFile(name);
    return data ? { length: data.length, data } : { length: -1, data: null };
  },
  FS_FreeFile,
  FS_Gamedir: () => FS_Gamedir(),
  Cvar_Get,
  Cvar_Set: (name: string, value: string) => Cvar_Set(name, value) ?? new CvarT(),
  Cvar_SetValue: () => {},
  Vid_GetModeInfo: () => null,
  Vid_MenuInit: () => {},
  Vid_NewWindow: () => {},
};

describe("cmd parity audit -- every C Cmd_AddCommand site has a matching TS registration", () => {
  let tmpRoot = "";

  beforeAll(async () => {
    tmpRoot = mkdtempSync(join(tmpdir(), "q2cmdparity-"));
    const baseq2Dir = join(tmpRoot, "baseq2");
    mkdirSync(join(baseq2Dir, "pics"), { recursive: true });
    // R_Init's Draw_GetPalette reads this unconditionally, independent of
    // any map load (see test/sdl_platform.test.ts's identical setup).
    writeFileSync(join(baseq2Dir, "pics", "colormap.pcx"), buildColormapPcx());
    // GL_InitImages' 16-bit-to-8-bit paletted-texture table: only ever
    // stored, never parsed, at init time, so any non-empty placeholder is
    // enough for the function to run to completion.
    writeFileSync(join(baseq2Dir, "pics", "16to8.dat"), new Uint8Array(1));

    // Sibling suites in the same bun process may have already registered
    // these as CVAR_NOSET/CVAR_LATCH, so force-set rather than rely on the
    // "+set" argv below to take (same pattern as test/cvar_parity.test.ts).
    Cvar_ForceSet("basedir", tmpRoot);
    Cvar_ForceSet("game", "");
    Cvar_ForceSet("port", "0"); // bind an ephemeral UDP port, never a fixed one
    Cvar_ForceSet("dedicated", "0"); // the client path is what registers most of MANIFEST

    // Qcommon_Init's CL_Init (dedicated 0) drives Con_Init, S_Init, VID_Init
    // (-> ref_soft's R_Register, since vid_ref defaults to "soft"),
    // CDAudio_Init, and CL_InitLocal/IN_Init -- the bulk of MANIFEST. SV_Init
    // (always run, dedicated or not) drives SV_InitOperatorCommands.
    Qcommon_Init(["quake2", "+set", "basedir", tmpRoot, "+set", "dedicated", "0", "+set", "port", "0"]);

    // sys_linux.c's main() registers nostdout right after Qcommon_Init;
    // registered directly here at the same point (same as cvar_parity.test.ts).
    setNostdout(Cvar_Get("nostdout", "0", 0));

    // NET_Config(true) is normally reached only once something actually
    // connects/hosts; called directly here so afterAll's NET_Shutdown has a
    // socket to close cleanly (this suite does not itself depend on any
    // cvar/command NET_Config registers).
    await NET_Config(true);

    // CM_LoadMap registers map_noareas unconditionally before it even looks
    // at its `name` argument; an empty name takes the early return right
    // after, so this never touches the filesystem or any other test's
    // loaded-map state.
    CM_LoadMap("", true);

    // ref_gl/gl_rmain.ts's R_Register never runs on the "soft" boot path
    // above (only one renderer loads at a time) -- driven directly so
    // gl_strings (its one command with no ref_soft counterpart) lands in
    // the real registry, through the real Cmd_AddCommand (see glRefImports).
    GlSetRefImports(glRefImports);
    R_Register();
    SetQGL(new QGLRecording()); // GL_InitImages checks qgl.qglColorTableEXT
    GL_InitImages();

    // vid_menu.ts's registrations are otherwise reachable only by opening
    // the in-game video options menu (menu.ts calls VID_MenuInit directly).
    // Not a command source itself, but kept for parity with cvar_parity's
    // boot sequence in case a future menu command lands there.
    VID_MenuInit();
  });

  afterAll(async () => {
    SV_Shutdown("cmd parity test finished\n", false);
    NET_ClearLoopback();
    await NET_Shutdown();
    setRe(null);
    SDL_ResetBackendForTests();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test(`every one of the ${MANIFEST.length} audited commands is registered`, () => {
    const missing = MANIFEST.filter((name) => !Cmd_Exists(name));
    expect(missing).toEqual([]);
  });

  test("MANIFEST has no accidental duplicate names", () => {
    const seen = new Set<string>();
    const dupes = MANIFEST.filter((name) => (seen.has(name) ? true : (seen.add(name), false)));
    expect(dupes).toEqual([]);
  });
});
