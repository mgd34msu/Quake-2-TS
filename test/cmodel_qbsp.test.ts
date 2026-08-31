/*
QBSP extended-format coverage for src/qcommon/cmodel.ts.

Two layers:
  1. Byte-decode unit tests directly against src/qcommon/qfiles.ts's Ext
     readers (readDbrushsideExt, readUint32, readDleafExt, readDnodeExt) --
     hand-built records covering values that would overflow the classic
     16-bit fields (the whole reason QBSP exists).
  2. An integration test: a hand-built QBSP-format box room (same geometry as
     test/support/bsp_builder.ts's classic buildBoxRoomBsp, but every
     E()-tagged lump re-encoded at QBSP widths and the header ident set to
     IDBSPHEADER_EXT) loaded through the real CM_LoadMap, exercising point
     containment and box tracing exactly like test/cmodel_map.test.ts does
     for the classic format -- proving the QBSP path produces the same
     collision behavior, not just that it parses without throwing.

Does not touch test/support/bsp_builder.ts (shared/owned elsewhere) -- the
QBSP buffer is built inline here since its record widths differ lump-by-lump
from the classic builder's.
*/

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cvar_ForceSet } from "../src/qcommon/cvar";
import { FS_InitFilesystem } from "../src/qcommon/files";
import { CM_LoadMap, CM_NumInlineModels, CM_EntityString, CM_PointContents, CM_BoxTrace } from "../src/qcommon/cmodel";
import { CONTENTS_SOLID } from "../src/shared/q_shared";
import { vec3 } from "../src/shared/math";
import {
  HEADER_LUMPS,
  LUMP_ENTITIES,
  LUMP_PLANES,
  LUMP_VISIBILITY,
  LUMP_NODES,
  LUMP_TEXINFO,
  LUMP_LEAFS,
  LUMP_LEAFBRUSHES,
  LUMP_MODELS,
  LUMP_BRUSHES,
  LUMP_BRUSHSIDES,
  LUMP_AREAS,
  LUMP_AREAPORTALS,
  IDBSPHEADER_EXT,
  BSPVERSION,
  DHEADER_T_SIZE,
  DMODEL_T_SIZE,
  DPLANE_T_SIZE,
  TEXINFO_T_SIZE,
  DBRUSH_T_SIZE,
  DAREA_T_SIZE,
  DBRUSHSIDE_EXT_T_SIZE,
  LEAFBRUSH_EXT_SIZE,
  DLEAF_EXT_T_SIZE,
  DNODE_EXT_T_SIZE,
  readDbrushsideExt,
  readUint32,
  readDleafExt,
  readDnodeExt,
} from "../src/qcommon/qfiles";

//=============================================================================
// Layer 1: byte-decode unit tests against the raw Ext readers.

describe("qfiles.ts QBSP extended-record readers -- hand-built parse vectors", () => {
  test("readDbrushsideExt: 32-bit planenum/texinfo survive values that overflow uint16", () => {
    const buf = new Uint8Array(DBRUSHSIDE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 70000, true); // planenum: over 65535, the classic uint16 ceiling
    view.setUint32(4, 40000, true); // texinfo: over 65535 too
    const rec = readDbrushsideExt(view, 0);
    expect(rec.planenum).toBe(70000);
    expect(rec.texinfo).toBe(40000);
  });

  test("readDbrushsideExt: null-texinfo sentinel (0xFFFFFFFF) normalizes to -1", () => {
    const buf = new Uint8Array(DBRUSHSIDE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 5, true);
    view.setUint32(4, 0xffffffff, true);
    const rec = readDbrushsideExt(view, 0);
    expect(rec.texinfo).toBe(-1);
  });

  test("readUint32 (LeafBrushes/LeafFaces Ext index): reads a brush index over 65536", () => {
    const buf = new Uint8Array(LEAFBRUSH_EXT_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 141772, true); // retail maps/mguhub.bsp's actual worst-case leafbrush count
    expect(readUint32(view, 0)).toBe(141772);
  });

  test("readDleafExt: widened cluster/area/leafbrush fields and float mins/maxs", () => {
    const buf = new Uint8Array(DLEAF_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setInt32(0, CONTENTS_SOLID, true); // contents
    view.setUint32(4, 90000, true); // cluster: over uint16 ceiling
    view.setUint32(8, 200, true); // area
    view.setFloat32(12, -4096.5, true); // mins.x -- exceeds int16 range (classic format truncates this)
    view.setFloat32(16, -100, true);
    view.setFloat32(20, -100, true);
    view.setFloat32(24, 4096.5, true); // maxs.x
    view.setFloat32(28, 100, true);
    view.setFloat32(32, 100, true);
    view.setUint32(36, 223000, true); // firstleafface: retail worst case is 223570
    view.setUint32(40, 10, true); // numleaffaces
    view.setUint32(44, 141000, true); // firstleafbrush
    view.setUint32(48, 5, true); // numleafbrushes

    const rec = readDleafExt(view, 0);
    expect(rec.contents).toBe(CONTENTS_SOLID);
    expect(rec.cluster).toBe(90000);
    expect(rec.area).toBe(200);
    expect(rec.mins).toEqual([-4096.5, -100, -100]);
    expect(rec.maxs).toEqual([4096.5, 100, 100]);
    expect(rec.firstleafface).toBe(223000);
    expect(rec.numleaffaces).toBe(10);
    expect(rec.firstleafbrush).toBe(141000);
    expect(rec.numleafbrushes).toBe(5);
  });

  test("readDleafExt: cluster null sentinel (0xFFFFFFFF) normalizes to -1 (solid leaf convention)", () => {
    const buf = new Uint8Array(DLEAF_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(4, 0xffffffff, true);
    expect(readDleafExt(view, 0).cluster).toBe(-1);
  });

  test("readDnodeExt: signed planenum/children plus widened float mins/maxs and uint32 firstface/numfaces", () => {
    const buf = new Uint8Array(DNODE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setInt32(0, 5, true); // planenum
    view.setInt32(4, 3, true); // children[0]: node index
    view.setInt32(8, -1, true); // children[1]: ~0 = leaf 0
    view.setFloat32(12, -8192, true);
    view.setFloat32(16, -8192, true);
    view.setFloat32(20, -8192, true);
    view.setFloat32(24, 8192, true);
    view.setFloat32(28, 8192, true);
    view.setFloat32(32, 8192, true);
    view.setUint32(36, 80000, true); // firstface: retail worst case is 80015 nodes, plenty of faces per map
    view.setUint32(40, 4, true); // numfaces

    const rec = readDnodeExt(view, 0);
    expect(rec.planenum).toBe(5);
    expect(rec.children).toEqual([3, -1]);
    expect(rec.mins).toEqual([-8192, -8192, -8192]);
    expect(rec.maxs).toEqual([8192, 8192, 8192]);
    expect(rec.firstface).toBe(80000);
    expect(rec.numfaces).toBe(4);
  });
});

//=============================================================================
// Layer 2: end-to-end QBSP box room through the real CM_LoadMap.

const ROOM_HALF = 64;

interface WallPlane {
  normal: [number, number, number];
  dist: number;
  type: number;
}

function wallPlanes(): WallPlane[] {
  const h = ROOM_HALF;
  return [
    { normal: [-1, 0, 0], dist: -h, type: 3 },
    { normal: [1, 0, 0], dist: -h, type: 0 },
    { normal: [0, -1, 0], dist: -h, type: 4 },
    { normal: [0, 1, 0], dist: -h, type: 1 },
    { normal: [0, 0, -1], dist: -h, type: 5 },
    { normal: [0, 0, 1], dist: -h, type: 2 },
  ];
}

const SOLID_LEAF = 0;
const EMPTY_LEAF = 1;

function stringBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function writeFixedString(view: DataView, base: number, s: string, maxLen: number): void {
  for (let i = 0; i < maxLen; i++) view.setUint8(base + i, i < s.length ? s.charCodeAt(i) : 0);
}

/*
Same hollow-box-room shape as test/support/bsp_builder.ts's buildBoxRoomBsp,
but every E()-tagged lump (BrushSides, LeafBrushes, Leafs, Nodes) is encoded
at its QBSP width instead of the classic one, and the header ident is
IDBSPHEADER_EXT. L()-tagged lumps (Planes, Texinfo, Brushes, Areas,
AreaPortals, SubModels, EntString) are byte-identical to the classic format,
so this reuses the same encoding the classic builder uses for those.
*/
function buildQbspBoxRoom(entityString: string): Uint8Array {
  const planes = wallPlanes();

  // ---- PLANES (6): unchanged classic layout, L()-tagged ----
  const planesLump = new Uint8Array(planes.length * DPLANE_T_SIZE);
  {
    const view = new DataView(planesLump.buffer);
    planes.forEach((p, i) => {
      const base = i * DPLANE_T_SIZE;
      view.setFloat32(base, p.normal[0], true);
      view.setFloat32(base + 4, p.normal[1], true);
      view.setFloat32(base + 8, p.normal[2], true);
      view.setFloat32(base + 12, p.dist, true);
      view.setInt32(base + 16, p.type, true);
    });
  }

  // ---- NODES (6) QBSP: 44 bytes each. planenum/children stay 4-byte
  // Long reads in both formats (bsp_template.c never widens them); only the
  // trailing mins/maxs/firstface/numfaces span widens (16 -> 32 bytes),
  // and cmodel.ts (collision-only) never reads that span at all, so it's
  // left zeroed here. ----
  const nodeCount = 6;
  const nodesLump = new Uint8Array(nodeCount * DNODE_EXT_T_SIZE);
  {
    const view = new DataView(nodesLump.buffer);
    for (let i = 0; i < nodeCount; i++) {
      const base = i * DNODE_EXT_T_SIZE;
      const insideChild = i === nodeCount - 1 ? -1 - EMPTY_LEAF : i + 1;
      const outsideChild = -1 - SOLID_LEAF;
      view.setInt32(base, i, true); // planenum
      view.setInt32(base + 4, insideChild, true); // children[0]
      view.setInt32(base + 8, outsideChild, true); // children[1]
      // bytes 12..43 (mins/maxs/firstface/numfaces): left zeroed, cmodel.ts never reads them
    }
  }

  // ---- TEXINFO (1): unchanged classic layout, L()-tagged ----
  const texinfoLump = new Uint8Array(TEXINFO_T_SIZE);
  {
    const view = new DataView(texinfoLump.buffer);
    view.setFloat32(0, 1, true); // s axis
    view.setFloat32(16, 0, true);
    view.setFloat32(20, 1, true); // t axis
    view.setInt32(32, 0, true); // flags
    view.setInt32(36, 0, true); // value
    writeFixedString(view, 40, "wall", 32);
    view.setInt32(72, -1, true); // nexttexinfo
  }

  // ---- LEAFS (2) QBSP: 52 bytes each. No Visibility lump in this room, so
  // CMod_LoadLeafsExt's "map has no vis, use cluster 0" branch applies to
  // the empty leaf; the solid leaf uses the null-cluster sentinel. ----
  const leafsLump = new Uint8Array(2 * DLEAF_EXT_T_SIZE);
  {
    const view = new DataView(leafsLump.buffer);
    for (let i = 0; i < 2; i++) {
      const base = i * DLEAF_EXT_T_SIZE;
      const solid = i === SOLID_LEAF;
      view.setInt32(base, solid ? CONTENTS_SOLID : 0, true); // contents
      view.setUint32(base + 4, solid ? 0xffffffff : 0, true); // cluster: sentinel for solid, else real value (overridden to 0 by the no-vis fallback anyway)
      view.setUint32(base + 8, solid ? 0 : 1, true); // area
      // bytes 12..43 (mins/maxs/firstleafface/numleaffaces): unused by cmodel.ts, left zeroed
      view.setUint32(base + 44, 0, true); // firstleafbrush
      view.setUint32(base + 48, solid ? 6 : 0, true); // numleafbrushes
    }
  }

  // ---- LEAFBRUSHES (6) QBSP: 4 bytes each ----
  const leafbrushesLump = new Uint8Array(6 * LEAFBRUSH_EXT_SIZE);
  {
    const view = new DataView(leafbrushesLump.buffer);
    for (let i = 0; i < 6; i++) view.setUint32(i * LEAFBRUSH_EXT_SIZE, i, true);
  }

  // ---- BRUSHES (6): unchanged classic layout, L()-tagged ----
  const brushesLump = new Uint8Array(6 * DBRUSH_T_SIZE);
  {
    const view = new DataView(brushesLump.buffer);
    for (let i = 0; i < 6; i++) {
      const base = i * DBRUSH_T_SIZE;
      view.setInt32(base, i, true); // firstside
      view.setInt32(base + 4, 1, true); // numsides
      view.setInt32(base + 8, CONTENTS_SOLID, true); // contents
    }
  }

  // ---- BRUSHSIDES (6) QBSP: 8 bytes each ----
  const brushsidesLump = new Uint8Array(6 * DBRUSHSIDE_EXT_T_SIZE);
  {
    const view = new DataView(brushsidesLump.buffer);
    for (let i = 0; i < 6; i++) {
      const base = i * DBRUSHSIDE_EXT_T_SIZE;
      view.setUint32(base, i, true); // planenum
      view.setUint32(base + 4, 0, true); // texinfo
    }
  }

  // ---- MODELS (1): unchanged classic layout, L()-tagged ----
  const modelsLump = new Uint8Array(DMODEL_T_SIZE);
  {
    const view = new DataView(modelsLump.buffer);
    const h = ROOM_HALF;
    view.setFloat32(0, -h, true);
    view.setFloat32(4, -h, true);
    view.setFloat32(8, -h, true);
    view.setFloat32(12, h, true);
    view.setFloat32(16, h, true);
    view.setFloat32(20, h, true);
    view.setInt32(36, 0, true); // headnode
  }

  // ---- AREAS (2), AREAPORTALS (0): unchanged classic layout, L()-tagged.
  // Two areas because the leafs above use area indices 0 (solid) and 1
  // (empty) -- CMod_LoadLeafsExt validates `area < numareas` (bsp.c:
  // BSP_ENSURE(area < bsp->numareas, "Bad area")), unlike the classic
  // CMod_LoadLeafs, which never checked this. ----
  const areasLump = new Uint8Array(2 * DAREA_T_SIZE);
  {
    const view = new DataView(areasLump.buffer);
    for (let i = 0; i < 2; i++) {
      view.setInt32(i * DAREA_T_SIZE, 0, true); // numareaportals
      view.setInt32(i * DAREA_T_SIZE + 4, 0, true); // firstareaportal
    }
  }
  const areaportalsLump = new Uint8Array(0);

  const entitiesLump = stringBytes(entityString);
  const empty = new Uint8Array(0);

  const lumpOrder: Array<{ index: number; data: Uint8Array }> = [
    { index: LUMP_ENTITIES, data: entitiesLump },
    { index: LUMP_PLANES, data: planesLump },
    { index: LUMP_VISIBILITY, data: empty },
    { index: LUMP_NODES, data: nodesLump },
    { index: LUMP_TEXINFO, data: texinfoLump },
    { index: LUMP_LEAFS, data: leafsLump },
    { index: LUMP_LEAFBRUSHES, data: leafbrushesLump },
    { index: LUMP_MODELS, data: modelsLump },
    { index: LUMP_BRUSHES, data: brushesLump },
    { index: LUMP_BRUSHSIDES, data: brushsidesLump },
    { index: LUMP_AREAS, data: areasLump },
    { index: LUMP_AREAPORTALS, data: areaportalsLump },
  ];

  const lumpInfo: Array<{ fileofs: number; filelen: number }> = new Array(HEADER_LUMPS).fill(null).map(() => ({ fileofs: 0, filelen: 0 }));
  let offset = DHEADER_T_SIZE;
  let totalDataLen = 0;
  for (const { data } of lumpOrder) totalDataLen += data.length;

  const out = new Uint8Array(DHEADER_T_SIZE + totalDataLen);
  const outView = new DataView(out.buffer);

  for (const { index, data } of lumpOrder) {
    lumpInfo[index] = { fileofs: offset, filelen: data.length };
    out.set(data, offset);
    offset += data.length;
  }

  outView.setInt32(0, IDBSPHEADER_EXT, true);
  outView.setInt32(4, BSPVERSION, true);
  for (let i = 0; i < HEADER_LUMPS; i++) {
    outView.setInt32(8 + i * 8, lumpInfo[i].fileofs, true);
    outView.setInt32(8 + i * 8 + 4, lumpInfo[i].filelen, true);
  }

  return out;
}

const WORLDSPAWN_ONLY_ENTITIES = '{\n"classname" "worldspawn"\n}\n';

describe("cmodel.ts -- CM_LoadMap against a QBSP-format box-room BSP", () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "q2cm-qbsp-"));
    const baseq2Dir = join(tmpRoot, "baseq2");
    const mapsDir = join(baseq2Dir, "maps");
    mkdirSync(baseq2Dir);
    mkdirSync(mapsDir);

    writeFileSync(join(mapsDir, "testroom_qbsp.bsp"), buildQbspBoxRoom(WORLDSPAWN_ONLY_ENTITIES));

    Cvar_ForceSet("basedir", tmpRoot);
    FS_InitFilesystem();
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("loads a QBSP-ident map ('QBSP', not 'IBSP') with a nonzero checksum, one inline model, and its entity string", () => {
    const { checksum } = CM_LoadMap("maps/testroom_qbsp.bsp", false);
    expect(checksum).not.toBe(0);
    expect(CM_NumInlineModels()).toBeGreaterThanOrEqual(1);
    expect(CM_EntityString()).toContain("worldspawn");
  });

  test("room center is empty, well outside the walls is solid -- same collision result as the classic-format room", () => {
    const { model } = CM_LoadMap("maps/testroom_qbsp.bsp", false);
    expect(CM_PointContents(vec3(0, 0, 0), model.headnode)).toBe(0);
    expect(CM_PointContents(vec3(ROOM_HALF + 36, 0, 0), model.headnode)).toBe(CONTENTS_SOLID);
  });

  test("a trace from the center into a wall stops short with a plane normal pointing back at the start", () => {
    const { model } = CM_LoadMap("maps/testroom_qbsp.bsp", false);
    const start = vec3(0, 0, 0);
    const end = vec3(ROOM_HALF + 36, 0, 0);
    const trace = CM_BoxTrace(start, end, vec3(0, 0, 0), vec3(0, 0, 0), model.headnode, CONTENTS_SOLID);

    expect(trace.fraction).toBeLessThan(1);
    expect(trace.plane.normal[0]).toBeLessThan(0);
    expect(trace.plane.normal[1]).toBe(0);
    expect(trace.plane.normal[2]).toBe(0);
  });

  test("a trace between two interior points is unobstructed (fraction 1)", () => {
    const { model } = CM_LoadMap("maps/testroom_qbsp.bsp", false);
    const start = vec3(-30, 0, 0);
    const end = vec3(30, 0, 0);
    const trace = CM_BoxTrace(start, end, vec3(0, 0, 0), vec3(0, 0, 0), model.headnode, CONTENTS_SOLID);

    expect(trace.fraction).toBe(1);
  });
});

describe("cmodel.ts -- CM_LoadMap ident/format error handling", () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "q2cm-qbsp-err-"));
    const baseq2Dir = join(tmpRoot, "baseq2");
    const mapsDir = join(baseq2Dir, "maps");
    mkdirSync(baseq2Dir);
    mkdirSync(mapsDir);

    // a QBSP-ident map whose BrushSides lump has an out-of-range planenum
    // (bsp.c: BSP_ENSURE(planenum < bsp->numplanes, "Bad planenum")) --
    // CMod_LoadBrushSidesExt must reject it instead of reading garbage
    const bad = buildQbspBoxRoom(WORLDSPAWN_ONLY_ENTITIES);
    // BrushSides lump starts right after Brushes in this room's fixed
    // layout order; locate it via the header instead of a hardcoded offset
    const view = new DataView(bad.buffer);
    const brushsidesOfs = view.getInt32(8 + LUMP_BRUSHSIDES * 8, true);
    view.setUint32(brushsidesOfs, 999999, true); // planenum on brushside 0, way out of range
    writeFileSync(join(mapsDir, "badplane_qbsp.bsp"), bad);

    // a garbled ident: neither 'IBSP' nor 'QBSP'
    const garbled = buildQbspBoxRoom(WORLDSPAWN_ONLY_ENTITIES);
    new DataView(garbled.buffer).setInt32(0, 0x41424344, true);
    writeFileSync(join(mapsDir, "badident.bsp"), garbled);

    Cvar_ForceSet("basedir", tmpRoot);
    FS_InitFilesystem();
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("a QBSP BrushSidesExt record with an out-of-range planenum throws instead of loading", () => {
    expect(() => CM_LoadMap("maps/badplane_qbsp.bsp", false)).toThrow(/Bad planenum/);
  });

  test("an unrecognized ident (neither IBSP nor QBSP) throws instead of silently misparsing", () => {
    expect(() => CM_LoadMap("maps/badident.bsp", false)).toThrow(/unknown ident/);
  });
});
