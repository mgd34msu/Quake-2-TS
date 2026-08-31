/*
Retail-gated sweep: every maps/mgu*.bsp in the real rerelease "Call of the
Machine" campaign pak, loaded through the real CM_LoadMap. This is the
direct verification for the reported defect ("i could not play Call of the
Machine" -- cmodel.ts:250's "Map has too many surfaces" against these
exact maps, texinfo counts 24270-36404 against the classic format's old
MAX_MAP_TEXINFO=8192 cap).

Skipped entirely when the retail install isn't present at
test/support/retail_pak.ts's RETAIL_ROOT (this machine has it; CI/other
machines won't, and this suite must not require copyrighted map data to
pass the rest of the tests).

Does not point FS at the real baseq2 directory (see retail_pak.ts's header
comment: files.ts's MAX_FILES_IN_PACK is still the vanilla-id 4096 cap,
which pak0.pak's real 14663-file directory blows through) -- instead reads
each map's bytes directly out of the pak with retail_pak.ts's own minimal
PACK reader and writes it out as a loose file under a throwaway tmp
baseq2/maps/ directory, which CM_LoadMap's real FS_LoadFile then finds via
the normal loose-file search path (no pak involved at all).
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cvar_ForceSet } from "../src/qcommon/cvar";
import { FS_InitFilesystem } from "../src/qcommon/files";
import { CM_LoadMap, CM_NumInlineModels } from "../src/qcommon/cmodel";
import { retailAssetsAvailable, listMguMapEntries, readPakEntry, RETAIL_PAK0 } from "./support/retail_pak";

const haveRetail = retailAssetsAvailable();

describe.skipIf(!haveRetail)("cmodel.ts -- CM_LoadMap sweep over every retail maps/mgu*.bsp (Call of the Machine)", () => {
  let tmpRoot: string;
  let mapNames: string[] = [];

  beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "q2cm-mgu-"));
    const baseq2Dir = join(tmpRoot, "baseq2");
    const mapsDir = join(baseq2Dir, "maps");
    mkdirSync(baseq2Dir);
    mkdirSync(mapsDir);

    const entries = listMguMapEntries();
    for (const entry of entries) {
      const bytes = readPakEntry(RETAIL_PAK0, entry);
      const base = entry.name.split("/").pop() as string;
      writeFileSync(join(mapsDir, base), bytes);
      mapNames.push(`maps/${base}`);
    }

    Cvar_ForceSet("basedir", tmpRoot);
    FS_InitFilesystem();
  }, 120000);

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("found every mgu*.bsp entry in the retail pak (sanity on the extraction step itself)", () => {
    expect(mapNames.length).toBeGreaterThanOrEqual(28);
  });

  test("every maps/mgu*.bsp loads through CM_LoadMap with no errors", () => {
    const failures: string[] = [];
    const results: { name: string; checksum: number; models: number }[] = [];

    for (const name of mapNames) {
      try {
        const { checksum } = CM_LoadMap(name, false);
        const models = CM_NumInlineModels();
        results.push({ name, checksum, models });
        if (checksum === 0) failures.push(`${name}: zero checksum`);
        if (models < 1) failures.push(`${name}: no inline models`);
      } catch (err) {
        failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `\ncmodel.ts QBSP retail sweep -- ${results.length}/${mapNames.length} loaded:\n` +
        results.map((r) => `  ${r.name}: checksum=${r.checksum.toString(16)} models=${r.models}`).join("\n"),
    );

    expect(failures).toEqual([]);
    expect(results.length).toBe(mapNames.length);
  }, 300000);
});

describe.skipIf(haveRetail)("cmodel.ts -- retail QBSP sweep (skipped: no retail install found)", () => {
  test("skipped", () => {
    expect(true).toBe(true);
  });
});
