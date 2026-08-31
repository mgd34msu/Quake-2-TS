/*
Retail-gated: dedicated-server boot against the two maps rule 19's live-gate
calls out by name -- maps/mguhub.bsp and maps/mgu1m1.bsp, the real retail
"Call of the Machine" campaign data (see test/support/retail_pak.ts for how
the map bytes are extracted without touching the real pak0.pak, which is
blocked by an unrelated files.ts cap -- see that module's header comment).

Scope note on "LIVE GATE (rule 19, our binary both seats): self-play on
mgu1m1 at game=kex -- connect, spawn, sustained movement, zero errors":
this repo has no windowing/input-injection tooling this agent can drive (no
Xvfb, no scripted-input harness, nothing under scripts/ or a project skill
for it -- confirmed absent, not just unused), and this environment cannot
open an interactive session with a human at the controls either. What *is*
verifiable headlessly, and IS this task's actual territory (BSP loading, not
game-library or protocol correctness), is exercised here: booting the real
dedicated server all the way to ss_game against the real BSP geometry from
these two maps, through the same `map <name>` console command path
test/boot.test.ts already uses for the synthetic-map boot test, with zero
thrown errors along the way. The entity string used is the real one baked
into each retail .bsp (not a synthetic substitute) -- this repo's game
library (src/game/*) is the classic id Software GPL game code, not the
rerelease's own game DLL (game_x64.dll, a native binary, never loaded by
this port), so any rerelease-only entity classnames in that string just hit
ED_CallSpawn's normal "doesn't have a spawn function" debug fallback
(g_spawn.ts:508) instead of an error -- confirmed by reading that function
before relying on it here. "Connect, spawn, sustained movement" client-side
play-testing is explicitly not attempted: that requires a real player
session (input, rendering, or a scripted bot -- none of which exist in this
repo or this agent's toolset), and is out of this port's BSP-loading
territory besides.
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cvar_ForceSet } from "../src/qcommon/cvar";
import { Cbuf_AddText } from "../src/qcommon/cmd";
import { NET_Shutdown } from "../src/platform/net_udp";
import { Qcommon_Init, runFrames } from "../src/main";
import { sv, ServerStateT } from "../src/server/server";
import { SV_Shutdown } from "../src/server/sv_main";
import { retailAssetsAvailable, listMguMapEntries, readPakEntry, RETAIL_PAK0 } from "./support/retail_pak";

const haveRetail = retailAssetsAvailable();
const MAP_POLL_LIMIT = 400;

describe.skipIf(!haveRetail)("dedicated server boot against real retail Call of the Machine maps (rule 19 live-gate, BSP-loading slice)", () => {
  let tmpRoot: string;

  beforeAll(async () => {
    tmpRoot = mkdtempSync(join(tmpdir(), "q2mgu-boot-"));
    const baseq2Dir = join(tmpRoot, "baseq2");
    const mapsDir = join(baseq2Dir, "maps");
    mkdirSync(baseq2Dir);
    mkdirSync(mapsDir);

    const entries = listMguMapEntries();
    for (const wanted of ["mguhub.bsp", "mgu1m1.bsp"]) {
      const entry = entries.find((e) => e.name === `maps/${wanted}`);
      if (!entry) throw new Error(`retail pak is missing ${wanted}`);
      writeFileSync(join(mapsDir, wanted), readPakEntry(RETAIL_PAK0, entry));
    }

    Cvar_ForceSet("basedir", tmpRoot);
    Cvar_ForceSet("game", "");
    Cvar_ForceSet("port", "0");
    Cvar_ForceSet("dedicated", "1");
    Cvar_ForceSet("coop", "1");
    Cvar_ForceSet("deathmatch", "0");

    Qcommon_Init(["quake2", "+set", "basedir", tmpRoot, "+set", "coop", "1", "+set", "port", "0"]);
  }, 120000);

  afterAll(async () => {
    SV_Shutdown("mgu retail boot test finished\n", false);
    await NET_Shutdown();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  for (const mapname of ["mguhub", "mgu1m1"]) {
    test(`maps/${mapname}.bsp: dedicated server reaches Server Initialization / ss_game with zero errors`, async () => {
      let caught: unknown = null;
      Cbuf_AddText(`map ${mapname}\n`);
      // poll on both sv.state and sv.name -- a prior test in this same
      // describe block may have already left sv.state at ss_game (from the
      // previous map), so state alone is not enough to detect that this
      // map's own "map <name>" command has actually taken effect yet.
      for (let i = 0; i < MAP_POLL_LIMIT && (sv.state !== ServerStateT.ss_game || sv.name !== mapname); i++) {
        try {
          runFrames(1, 100);
        } catch (err) {
          caught = err;
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await Bun.sleep(1);
      }

      if (caught) {
        throw caught instanceof Error ? caught : new Error(String(caught));
      }
      expect(sv.state).toBe(ServerStateT.ss_game);
      expect(sv.name).toBe(mapname);

      // sustained frames past the initial spawn, same zero-error bar
      expect(() => runFrames(50, 100)).not.toThrow();
      expect(sv.state).toBe(ServerStateT.ss_game);
    }, 60000);
  }
});
