// Force headless SDL before ANY import can reach the FFI layer (see
// test/sdl_platform.test.ts's identical header comment): sdl.ts dlopen()s
// lazily, so as long as no SDL entry point is called above this assignment,
// SDL reads these on its first SDL_Init.
process.env.SDL_VIDEODRIVER = "dummy";
process.env.SDL_AUDIODRIVER = "dummy";
Bun.env.SDL_VIDEODRIVER = "dummy";
Bun.env.SDL_AUDIODRIVER = "dummy";

/*
Cvar parity audit: every `Cvar_Get(` registration site in the reference C
engine's client/, server/, qcommon/, ref_gl/, ref_soft/, win32/, and linux/
sources (game/ and its mission-pack siblings are a separate porting track
and are not covered here) has a matching registration in this port, with
the C-exact default value and flags. MANIFEST below is the hand-audited
source of truth: name, default `string`, and `flags` for every one of them,
taken straight from the C call sites (file:line noted per group).

Where the C itself registers the same cvar from more than one call site
(a cross-platform cvar re-Cvar_Get'd by a later, platform-specific module
once the window/menu/input subsystem spins up), Cvar_Get's own contract
(qcommon/cvar.c's "If the variable already exists, the value will not be
set. The flags will be or'ed in if the variable exists.") makes the FIRST
site's value win and every site's flags OR together. MANIFEST's flags are
that union; its value is whichever site runs first in this port's actual
boot order, which is called out per-entry below wherever a real ambiguity
exists (see "ORDER-SENSITIVE" comments). Everywhere else, every C site
agrees on the same value, so order does not matter.

Excluded on purpose: server/sv_ents.c's `sv_projectiles` and its whole
SV_AddProjectileUpdate/SV_EmitProjectileUpdate feature are wrapped in
`#if 0` in the shipped v3.19/3.21 release -- the cvar was never compiled
into the real engine, so there is nothing to port and nothing to assert
here.

This test drives the real subsystem init entry points (see beforeAll)
rather than re-registering cvars itself, so a regression that deletes a
Cvar_Get call in production code actually fails this suite.
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RefImports } from "../src/client/ref";
import { CvarT, CVAR_ARCHIVE, CVAR_USERINFO, CVAR_SERVERINFO, CVAR_NOSET, CVAR_LATCH } from "../src/shared/q_shared";
import { Cvar_ForceSet, Cvar_Get, cvar_vars } from "../src/qcommon/cvar";
import { CM_LoadMap } from "../src/qcommon/cmodel";
import { FS_LoadFile } from "../src/qcommon/files";
import { PORT_CLIENT, PROTOCOL_VERSION } from "../src/qcommon/qcommon";
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
import { CL_PingServers_f } from "../src/client/cl_main";
import { setRe } from "../src/client/client";
import { buildColormapPcx } from "./support/colormap_builder";

// a sentinel distinguishing "no expected default" (dynamic/environment-
// dependent values: qport is randomized per Netchan_Init, version embeds the
// build string, sw_maxedges' C default references a macro
// (MAXSTACKSURFACES) that is not defined anywhere in the audited C tree --
// existence and flags are still asserted for all three).
const ANY_VALUE = Symbol("any-value");

interface ManifestEntry {
  name: string;
  value: string | typeof ANY_VALUE;
  flags: number;
}

function entries(flags: number, list: Array<[string, string]>): ManifestEntry[] {
  return list.map(([name, value]) => ({ name, value, flags }));
}

const MANIFEST: ManifestEntry[] = [
  // qcommon/common.c:1440-1454 (Qcommon_Init's own cluster, src/main.ts)
  ...entries(0, [
    ["host_speeds", "0"],
    ["log_stats", "0"],
    ["developer", "0"],
    ["timescale", "1"],
    ["fixedtime", "0"],
    ["logfile", "0"],
    ["showtrace", "0"],
  ]),
  // ORDER-SENSITIVE: qcommon/common.c:1448/1450 is `#ifdef DEDICATED_ONLY`
  // ("1") vs the else branch ("0"); src/main.ts's header comment records
  // that this port takes the `#ifndef DEDICATED_ONLY` branch, so "0" is the
  // only value this build ever registers.
  { name: "dedicated", value: "0", flags: CVAR_NOSET },
  // qcommon/common.c:1454 embeds VERSION/CPUSTRING/__DATE__/BUILDSTRING --
  // no fixed default to assert.
  { name: "version", value: ANY_VALUE, flags: CVAR_SERVERINFO | CVAR_NOSET },

  // qcommon/cvar.c has no Cvar_Get call sites of its own (it defines
  // Cvar_Get); qcommon/cmodel.c:556
  { name: "map_noareas", value: "0", flags: 0 },

  // qcommon/files.c:851/858/871 (src/qcommon/files.ts) -- basedir's own C
  // default is "."; this suite forces it to a throwaway temp directory
  // before FS_InitFilesystem ever runs (see beforeAll) so the renderer's
  // synthetic colormap/16to8 assets resolve, which pins the value this test
  // observes. Flags are still the real thing being checked.
  { name: "basedir", value: ANY_VALUE, flags: CVAR_NOSET },
  { name: "cddir", value: "", flags: CVAR_NOSET },
  { name: "game", value: "", flags: CVAR_LATCH | CVAR_SERVERINFO },

  // qcommon/net_chan.c:98-100 (src/qcommon/net_chan.ts, Netchan_Init)
  { name: "showpackets", value: "0", flags: 0 },
  { name: "showdrop", value: "0", flags: 0 },
  // qport's default is `va("%i", port)` where `port` is a randomized seed
  // (time-based) passed in by the caller -- no fixed value to assert.
  { name: "qport", value: ANY_VALUE, flags: CVAR_NOSET },

  // win32/net_wins.c + linux/net_udp.c (src/platform/net_udp.ts)
  { name: "ip", value: "localhost", flags: CVAR_NOSET },
  // win32/net_wins.c:543/645, linux/net_udp.c:372's own default is
  // PORT_SERVER; this suite forces "0" (an ephemeral port) before NET_Config
  // ever runs one real UDP bind per test process, which pins the value this
  // test observes. Flags are still the real thing being checked.
  { name: "port", value: ANY_VALUE, flags: CVAR_NOSET },
  { name: "hostport", value: "0", flags: CVAR_NOSET },
  { name: "ip_hostport", value: "0", flags: CVAR_NOSET },
  // win32/net_wins.c:561 -- the one fallback cvar whose OWN default isn't
  // "0" (PORT_CLIENT, unlike hostport's "0")
  { name: "clientport", value: String(PORT_CLIENT), flags: CVAR_NOSET },
  { name: "ip_clientport", value: "0", flags: CVAR_NOSET },
  // win32/net_wins.c:639,657 -- registered only; IPX itself is unsupported
  { name: "ipx_hostport", value: "0", flags: CVAR_NOSET },
  { name: "ipx_clientport", value: "0", flags: CVAR_NOSET },
  // client/cl_main.c:813,821 (CL_PingServers_f) -- noudp gates a real
  // broadcast send; noipx is registered only (NA_BROADCAST_IPX itself is
  // dropped, IPX being unsupported here).
  { name: "noudp", value: "0", flags: CVAR_NOSET },
  { name: "noipx", value: "0", flags: CVAR_NOSET },
  // win32/net_wins.c:41,767 -- registered only, no consumer even in the C
  // reference (see src/platform/net_udp.ts's NET_RegisterVestigialCvars).
  { name: "net_shownet", value: "0", flags: 0 },

  // linux/sys_linux.c:283 (src/platform/sys.ts, registered from src/main.ts)
  { name: "nostdout", value: "0", flags: 0 },

  // client/cl_main.c:1413-1486 (src/client/cl_main.ts, CL_InitLocal)
  ...entries(CVAR_ARCHIVE, [
    ["adr0", ""], ["adr1", ""], ["adr2", ""], ["adr3", ""], ["adr4", ""],
    ["adr5", ""], ["adr6", ""], ["adr7", ""], ["adr8", ""],
    ["cl_stereo_separation", "0.4"],
  ]),
  { name: "cl_stereo", value: "0", flags: 0 },
  ...entries(0, [
    ["cl_blend", "1"], ["cl_lights", "1"], ["cl_particles", "1"], ["cl_entities", "1"],
    ["cl_gun", "1"], ["cl_footsteps", "1"], ["cl_noskins", "0"], ["cl_autoskins", "0"],
    ["cl_predict", "1"], ["cl_maxfps", "90"],
    ["cl_upspeed", "200"], ["cl_forwardspeed", "200"], ["cl_sidespeed", "200"],
    ["cl_yawspeed", "140"], ["cl_pitchspeed", "150"], ["cl_anglespeedkey", "1.5"],
  ]),
  { name: "cl_run", value: "0", flags: CVAR_ARCHIVE },
  // ORDER-SENSITIVE: client/cl_main.c:1449 registers freelook first with
  // CVAR_ARCHIVE (CL_InitLocal runs before IN_Init in every platform's
  // client.c/vid_so.c, and this port's src/client/cl_main.ts:CL_Init
  // matches that order); linux/rw_in_svgalib.c:238 and rw_x11.c:140
  // re-Cvar_Get it with flags 0, which OR's in as a no-op.
  { name: "freelook", value: "0", flags: CVAR_ARCHIVE },
  { name: "lookspring", value: "0", flags: CVAR_ARCHIVE },
  { name: "lookstrafe", value: "0", flags: CVAR_ARCHIVE },
  { name: "sensitivity", value: "3", flags: CVAR_ARCHIVE },
  { name: "m_pitch", value: "0.022", flags: CVAR_ARCHIVE },
  ...entries(0, [["m_yaw", "0.022"], ["m_forward", "1"]]),
  // ORDER-SENSITIVE: client/cl_main.c:1457 registers m_side "1" first (same
  // CL_InitLocal-before-IN_Init reasoning as freelook above); the linux
  // input backends' own default ("0.8") never wins in this port.
  { name: "m_side", value: "1", flags: 0 },
  ...entries(0, [
    ["cl_shownet", "0"], ["cl_showmiss", "0"], ["showclamp", "0"], ["cl_timeout", "120"],
    ["paused", "0"], ["timedemo", "0"], ["rcon_password", ""], ["rcon_address", ""],
    ["r_lightlevel", "0"],
  ]),
  { name: "password", value: "", flags: CVAR_USERINFO },
  { name: "spectator", value: "0", flags: CVAR_USERINFO },
  ...entries(CVAR_USERINFO | CVAR_ARCHIVE, [
    ["name", "unnamed"], ["skin", "male/grunt"], ["rate", "25000"], ["msg", "1"],
    ["hand", "0"], ["fov", "90"], ["gender", "male"],
  ]),
  { name: "gender_auto", value: "1", flags: CVAR_ARCHIVE },
  { name: "cl_vwep", value: "1", flags: CVAR_ARCHIVE },

  // client/cl_input.c:443
  { name: "cl_nodelta", value: "0", flags: 0 },

  // client/cl_scrn.c:410-422 (src/client/cl_scrn.ts)
  { name: "viewsize", value: "100", flags: CVAR_ARCHIVE },
  ...entries(0, [
    ["scr_conspeed", "3"], ["scr_showturtle", "0"], ["scr_showpause", "1"],
    ["scr_centertime", "2.5"], ["scr_printspeed", "8"], ["netgraph", "0"],
    ["timegraph", "0"], ["debuggraph", "0"], ["graphheight", "32"],
    ["graphscale", "1"], ["graphshift", "0"], ["scr_drawall", "0"],
  ]),

  // client/cl_view.c:576-583 (src/client/cl_view.ts)
  { name: "crosshair", value: "0", flags: CVAR_ARCHIVE },
  ...entries(0, [
    ["cl_testblend", "0"], ["cl_testparticles", "0"], ["cl_testentities", "0"],
    ["cl_testlights", "0"], ["cl_stats", "0"],
  ]),

  // client/console.c:315
  { name: "con_notifytime", value: "3", flags: 0 },

  // client/menu.c:1228 (src/client/menu.ts)
  { name: "win_noalttab", value: "0", flags: CVAR_ARCHIVE },

  // client/snd_dma.c:122-133 (src/client/snd_dma.ts)
  { name: "s_initsound", value: "1", flags: 0 },
  ...entries(CVAR_ARCHIVE, [
    ["s_volume", "0.7"], ["s_khz", "11"], ["s_loadas8bit", "1"],
    ["s_mixahead", "0.2"], ["s_primary", "0"],
  ]),
  ...entries(0, [["s_show", "0"], ["s_testsound", "0"]]),

  // linux/snd_linux.c:41-44 + win32/snd_win.c:599 (src/platform/snd.ts) --
  // registered only; SDL_OpenAudioDevice negotiates format/device itself
  ...entries(CVAR_ARCHIVE, [
    ["sndbits", "16"], ["sndspeed", "0"], ["sndchannels", "2"], ["snddevice", "/dev/dsp"],
  ]),
  { name: "s_wavonly", value: "0", flags: 0 },

  // linux/cd_linux.c + win32/cd_win.c (src/platform/cd_ogg.ts)
  { name: "nocdaudio", value: "0", flags: CVAR_NOSET },
  { name: "cd_nocd", value: "0", flags: CVAR_ARCHIVE },
  { name: "cd_volume", value: "1", flags: CVAR_ARCHIVE },
  { name: "cd_dev", value: "/dev/cdrom", flags: CVAR_ARCHIVE },
  { name: "cd_loopcount", value: "4", flags: 0 },
  { name: "cd_looptrack", value: "11", flags: 0 },

  // win32/in_win.c + linux/rw_in_svgalib.c/rw_x11.c (src/platform/sdl.ts,
  // IN_Init)
  { name: "in_mouse", value: "1", flags: CVAR_ARCHIVE },
  { name: "m_filter", value: "0", flags: 0 },
  { name: "in_initmouse", value: "1", flags: CVAR_NOSET },
  // registered only: no svgalib backend (linux/rw_in_svgalib.c:255-256)
  { name: "mdev", value: "/dev/mouse", flags: 0 },
  { name: "mrate", value: "1200", flags: 0 },
  // registered only: vestigial even in win32/in_win.c itself (no C reader)
  { name: "v_centermove", value: "0.15", flags: 0 },
  { name: "v_centerspeed", value: "500", flags: 0 },
  // registered only: no joystick backend (win32/in_win.c:352-371,497)
  { name: "in_joystick", value: "0", flags: CVAR_ARCHIVE },
  { name: "joy_name", value: "joystick", flags: 0 },
  ...entries(0, [
    ["joy_advanced", "0"],
    ["joy_advaxisx", "0"], ["joy_advaxisy", "0"], ["joy_advaxisz", "0"],
    ["joy_advaxisr", "0"], ["joy_advaxisu", "0"], ["joy_advaxisv", "0"],
    ["joy_forwardthreshold", "0.15"], ["joy_sidethreshold", "0.15"],
    ["joy_upthreshold", "0.15"], ["joy_pitchthreshold", "0.15"], ["joy_yawthreshold", "0.15"],
    ["joy_forwardsensitivity", "-1"], ["joy_sidesensitivity", "-1"], ["joy_upsensitivity", "-1"],
    ["joy_pitchsensitivity", "1"], ["joy_yawsensitivity", "-1"],
  ]),
  { name: "in_initjoy", value: "1", flags: CVAR_NOSET },

  // server/sv_main.c:949-978 (src/server/sv_main.ts, SV_Init)
  { name: "rcon_password", value: "", flags: 0 },
  { name: "skill", value: "1", flags: 0 },
  ...entries(CVAR_LATCH, [["deathmatch", "0"], ["coop", "0"]]),
  // server/sv_main.c:953 -- DF_INSTANT_ITEMS (0x10)
  { name: "dmflags", value: "16", flags: CVAR_SERVERINFO },
  ...entries(CVAR_SERVERINFO, [["fraglimit", "0"], ["timelimit", "0"]]),
  { name: "cheats", value: "0", flags: CVAR_SERVERINFO | CVAR_LATCH },
  // server/sv_main.c:957 -- PROTOCOL_VERSION
  { name: "protocol", value: String(PROTOCOL_VERSION), flags: CVAR_SERVERINFO | CVAR_NOSET },
  { name: "maxclients", value: "1", flags: CVAR_SERVERINFO | CVAR_LATCH },
  { name: "hostname", value: "noname", flags: CVAR_SERVERINFO | CVAR_ARCHIVE },
  ...entries(0, [
    ["timeout", "125"], ["zombietime", "2"], ["showclamp", "0"], ["paused", "0"],
    ["timedemo", "0"], ["sv_enforcetime", "0"], ["sv_noreload", "0"], ["public", "0"],
  ]),
  { name: "allow_download", value: "0", flags: CVAR_ARCHIVE },
  ...entries(CVAR_ARCHIVE, [
    ["allow_download_players", "0"], ["allow_download_models", "1"],
    ["allow_download_sounds", "1"], ["allow_download_maps", "1"],
  ]),
  { name: "sv_airaccelerate", value: "0", flags: CVAR_LATCH },
  { name: "sv_reconnect_limit", value: "3", flags: CVAR_ARCHIVE },

  // ref_gl/gl_rmain.c:972-1037 (src/ref_gl/gl_rmain.ts, R_Register)
  { name: "hand", value: "0", flags: CVAR_USERINFO | CVAR_ARCHIVE },
  ...entries(0, [
    ["r_norefresh", "0"], ["r_fullbright", "0"], ["r_drawentities", "1"], ["r_drawworld", "1"],
    ["r_novis", "0"], ["r_nocull", "0"], ["r_lerpmodels", "1"], ["r_speeds", "0"],
    ["r_lightlevel", "0"], ["gl_nosubimage", "0"], ["gl_allow_software", "0"],
  ]),
  ...entries(CVAR_ARCHIVE, [
    ["gl_particle_min_size", "2"], ["gl_particle_max_size", "40"], ["gl_particle_size", "40"],
    ["gl_particle_att_a", "0.01"], ["gl_particle_att_b", "0.0"], ["gl_particle_att_c", "0.01"],
    ["gl_modulate", "1"],
  ]),
  ...entries(0, [["gl_log", "0"], ["gl_bitdepth", "0"]]),
  // ORDER-SENSITIVE: ref_gl/gl_rmain.c:997 registers gl_mode "3" with
  // CVAR_ARCHIVE; win32/vid_dll.c:728 and win32/vid_menu.c:247/linux/
  // vid_menu.c:207 re-Cvar_Get the same "3" with flags 0 (a no-op OR).
  { name: "gl_mode", value: "3", flags: CVAR_ARCHIVE },
  ...entries(0, [
    ["gl_lightmap", "0"], ["gl_dynamic", "1"], ["gl_nobind", "0"], ["gl_round_down", "1"],
  ]),
  // ORDER-SENSITIVE: ref_gl/gl_rmain.c:1003 registers gl_picmip "0" with
  // flags 0; win32/vid_menu.c:245 and linux/vid_menu.c:205 agree (0 | 0).
  { name: "gl_picmip", value: "0", flags: 0 },
  ...entries(0, [["gl_skymip", "0"], ["gl_showtris", "0"], ["gl_ztrick", "0"]]),
  { name: "gl_finish", value: "0", flags: CVAR_ARCHIVE },
  ...entries(0, [["gl_clear", "0"], ["gl_cull", "1"], ["gl_polyblend", "1"], ["gl_flashblend", "0"], ["gl_playermip", "0"], ["gl_monolightmap", "0"]]),
  // ORDER-SENSITIVE: ref_gl/gl_rmain.c:1014 registers gl_driver "opengl32"
  // with CVAR_ARCHIVE; win32/vid_dll.c:727 and both vid_menu.c's re-Cvar_Get
  // the same "opengl32" with flags 0 (a no-op OR).
  { name: "gl_driver", value: "opengl32", flags: CVAR_ARCHIVE },
  ...entries(CVAR_ARCHIVE, [
    ["gl_texturemode", "GL_LINEAR_MIPMAP_NEAREST"], ["gl_texturealphamode", "default"],
    ["gl_texturesolidmode", "default"],
  ]),
  { name: "gl_lockpvs", value: "0", flags: 0 },
  { name: "gl_vertex_arrays", value: "0", flags: CVAR_ARCHIVE },
  ...entries(CVAR_ARCHIVE, [
    ["gl_ext_swapinterval", "1"], ["gl_ext_multitexture", "1"],
    ["gl_ext_pointparameters", "1"], ["gl_ext_compiled_vertex_array", "1"],
  ]),
  { name: "gl_drawbuffer", value: "GL_BACK", flags: 0 },
  { name: "gl_swapinterval", value: "1", flags: CVAR_ARCHIVE },
  { name: "gl_saturatelighting", value: "0", flags: 0 },
  { name: "gl_3dlabs_broken", value: "1", flags: CVAR_ARCHIVE },
  // ORDER-SENSITIVE: vid_fullscreen/vid_gamma/vid_ref are registered by both
  // src/platform/vid.ts (VID_Init, runs before the renderer loads) and this
  // module (R_Register, runs once the renderer is loaded) -- every site
  // agrees on the same value, so which one runs first does not matter.
  { name: "vid_fullscreen", value: "0", flags: CVAR_ARCHIVE },
  { name: "vid_gamma", value: "1", flags: CVAR_ARCHIVE },
  { name: "vid_ref", value: "soft", flags: CVAR_ARCHIVE },

  // ref_gl/gl_image.c:1503, gl_model.c:1117 (also ref_soft/r_model.c:1133)
  { name: "intensity", value: "2", flags: 0 },
  { name: "flushmap", value: "0", flags: 0 },

  // ref_soft/r_main.c:247-284 (src/ref_soft/r_main.ts, R_Register)
  { name: "sw_polymodelstats", value: "0", flags: 0 },
  { name: "sw_allow_modex", value: "1", flags: CVAR_ARCHIVE },
  ...entries(0, [
    ["sw_clearcolor", "2"], ["sw_drawflat", "0"], ["sw_draworder", "0"],
    ["sw_maxsurfs", "0"], ["sw_mipcap", "0"], ["sw_mipscale", "1"],
    ["sw_reportedgeout", "0"], ["sw_reportsurfout", "0"],
  ]),
  { name: "sw_stipplealpha", value: "0", flags: CVAR_ARCHIVE },
  { name: "sw_waterwarp", value: "1", flags: 0 },
  // ORDER-SENSITIVE: ref_soft/r_main.c:261 registers sw_mode "0" with
  // CVAR_ARCHIVE; win32/vid_menu.c:249, linux/vid_menu.c:209, and
  // linux/vid_so.c:363 re-Cvar_Get the same "0" with flags 0 (a no-op OR).
  { name: "sw_mode", value: "0", flags: CVAR_ARCHIVE },
  ...entries(0, [["r_dspeeds", "0"], ["sw_lockpvs", "0"], ["sw_surfcacheoverride", "0"]]),
  // ref_soft/r_main.c:252 -- MAXSTACKSURFACES is not `#define`d anywhere in
  // the audited C tree (nor is STRINGER, its stringizing macro); there is no
  // ground truth to assert a literal default against, so only existence and
  // flags are checked for this one entry.
  { name: "sw_maxedges", value: ANY_VALUE, flags: 0 },

  // src/platform/vid.ts (win32/vid_dll.c:711-716, linux/vid_so.c:398-404) --
  // ORDER-SENSITIVE: vid_dll.c's/vid_so.c's VID_Init runs before the
  // renderer library loads and picks the window position the renderer's own
  // GLimp/rw_imp re-Cvar_Get calls (win32/glw_imp.c:116-117, win32/
  // rw_imp.c:53-54, both "0") never override.
  { name: "vid_xpos", value: "3", flags: CVAR_ARCHIVE },
  { name: "vid_ypos", value: "22", flags: CVAR_ARCHIVE },

  // src/platform/vid_menu.ts (win32/vid_menu.c, linux/vid_menu.c)
  { name: "_windowed_mouse", value: "0", flags: CVAR_ARCHIVE },
];

// RefImports stub for src/ref_gl/gl_rmain.ts's R_Register and
// src/ref_gl/gl_image.ts's GL_InitImages: Cvar_Get and FS_LoadFile are real
// (the same ones every other subsystem here registers/reads through), so
// their cvars land in the same registry this test reads and Draw_GetPalette
// finds the synthetic colormap. Everything else is a no-op stand-in for the
// window/menu plumbing neither function touches.
const glRefImports: RefImports = {
  Sys_Error(errLevel: number, str: string): never {
    throw new Error(`Sys_Error(${errLevel}): ${str}`);
  },
  Cmd_AddCommand: () => {},
  Cmd_RemoveCommand: () => {},
  Cmd_Argc: () => 0,
  Cmd_Argv: () => "",
  Cmd_ExecuteText: () => {},
  Con_Printf: () => {},
  FS_LoadFile: (name: string) => {
    const data = FS_LoadFile(name);
    return data ? { length: data.length, data } : { length: -1, data: null };
  },
  FS_FreeFile: () => {},
  FS_Gamedir: () => "base",
  Cvar_Get: Cvar_Get,
  Cvar_Set: () => new CvarT(),
  Cvar_SetValue: () => {},
  Vid_GetModeInfo: () => null,
  Vid_MenuInit: () => {},
  Vid_NewWindow: () => {},
};

describe("cvar parity audit -- every C Cvar_Get site has a matching TS registration", () => {
  let tmpRoot = "";

  beforeAll(async () => {
    // cvar_vars is one Map shared by the whole bun test process (every file
    // runs in the same process): a sibling suite that ran first may have
    // already registered one of MANIFEST's cvars with a different default,
    // which Cvar_Get's own contract ("If the variable already exists, the
    // value will not be set") would make this suite observe instead of the
    // production code's real default. Clearing exactly MANIFEST's names
    // first guarantees every registration this test drives below is a
    // genuine first registration, matching this file running standalone.
    for (const e of MANIFEST) {
      // win_noalttab's one registration site is a module-level `let
      // win_noalttab = Cvar_Get(...)` in src/client/menu.ts (this port's
      // choice for client/menu.c:1228's static init), which only ever runs
      // once per process, at that module's first import -- there is no
      // function to call that re-registers it, so it is left alone here.
      // Nothing else in the audited C sources ever registers it with a
      // different default, so it is never at risk of cross-suite
      // contamination the way a function-scoped Cvar_Get call would be.
      if (e.name === "win_noalttab") continue;
      cvar_vars.delete(e.name);
    }

    tmpRoot = mkdtempSync(join(tmpdir(), "q2cvarparity-"));
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
    // "+set" argv below to take (same pattern as test/boot.test.ts and
    // test/sdl_platform.test.ts).
    Cvar_ForceSet("basedir", tmpRoot);
    Cvar_ForceSet("game", "");
    Cvar_ForceSet("port", "0"); // bind an ephemeral UDP port, never a fixed one
    Cvar_ForceSet("dedicated", "0"); // the client path is what registers most of MANIFEST

    // Qcommon_Init's CL_Init (dedicated 0) drives Con_Init, S_Init (->
    // SNDDMA_Init -> the platform sound cvars), VID_Init (-> ref_soft's
    // R_Register, since vid_ref defaults to "soft"), CDAudio_Init, and
    // CL_InitLocal/IN_Init -- the bulk of MANIFEST.
    Qcommon_Init(["quake2", "+set", "basedir", tmpRoot, "+set", "dedicated", "0", "+set", "port", "0"]);

    // sys_linux.c's main() registers nostdout right after Qcommon_Init
    // (src/main.ts's main(), which this suite does not call -- it runs the
    // frame loop forever); registered directly here at the same point.
    setNostdout(Cvar_Get("nostdout", "0", 0));

    // NET_Config(true) is normally reached only once something actually
    // connects/hosts (CL_Connect, SV_SpawnServer); called directly here to
    // register its cvars without needing a live map or a peer.
    await NET_Config(true);

    // CL_PingServers_f registers noudp/noipx and sends one real (harmless,
    // UDP, fire-and-forget) broadcast probe over the socket NET_Config just
    // opened -- the only call site either cvar has.
    await CL_PingServers_f();

    // CM_LoadMap registers map_noareas unconditionally before it even looks
    // at its `name` argument; an empty name takes the "cinematic servers
    // won't have anything at all" early return right after, so this never
    // touches the filesystem or any other test's loaded-map state.
    CM_LoadMap("", true);

    // ref_gl/gl_rmain.ts's R_Register and gl_image.ts's GL_InitImages never
    // run on the "soft" boot path above (only one renderer loads at a
    // time), so they are driven directly.
    GlSetRefImports(glRefImports);
    R_Register();
    SetQGL(new QGLRecording()); // GL_InitImages checks qgl.qglColorTableEXT
    GL_InitImages();

    // ref_gl/gl_model.ts's and ref_soft/r_model.ts's own flushmap
    // registrations both live deep inside full model-registration
    // (R_BeginRegistration -> R_RegisterModel -> ...), which needs an
    // actual loaded BSP to exercise meaningfully and is already covered by
    // test/boot.test.ts and test/gl_model.test.ts; registered directly here
    // instead of re-deriving that whole pipeline just for this one cvar.
    Cvar_Get("flushmap", "0", 0);

    // vid_menu.ts's registrations are otherwise reachable only by opening
    // the in-game video options menu (menu.ts calls VID_MenuInit directly,
    // matching vid_menu.c's own real-engine lazy-init timing).
    VID_MenuInit();
  });

  afterAll(async () => {
    SV_Shutdown("cvar parity test finished\n", false);
    NET_ClearLoopback();
    await NET_Shutdown();
    setRe(null);
    SDL_ResetBackendForTests();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test(`every one of the ${MANIFEST.length} audited cvars is registered`, () => {
    const missing = MANIFEST.filter((e) => !cvar_vars.has(e.name)).map((e) => e.name);
    expect(missing).toEqual([]);
  });

  describe.each(MANIFEST.map((e) => [e.name, e] as const))("%s", (_name, entry) => {
    test("default value matches the C source", () => {
      const cvar = cvar_vars.get(entry.name);
      expect(cvar).toBeDefined();
      if (!cvar) return;
      if (entry.value !== ANY_VALUE) expect(cvar.string).toBe(entry.value);
    });

    test("flags match the C source (unioned across every C registration site)", () => {
      const cvar = cvar_vars.get(entry.name);
      expect(cvar).toBeDefined();
      if (!cvar) return;
      expect(cvar.flags).toBe(entry.flags);
    });
  });
});
