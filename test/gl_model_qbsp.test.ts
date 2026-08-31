/*
Test support for src/ref_gl/gl_model.ts's QBSP extended-format ("Ext") brush
model loading (Mod_LoadEdgesExt, Mod_LoadFacesExt, Mod_LoadMarksurfacesExt,
Mod_LoadLeafsExt, Mod_LoadNodesExt), the ident dispatch added to Mod_ForName/
Mod_LoadBrushModel, and the MAX_MAP_SURFEDGES cap removal from
Mod_LoadSurfedges.

New file per brief: does not edit test/gl_model.test.ts or
test/support/bsp_builder.ts (both owned elsewhere). The QBSP room buffer
below is hand-built inline rather than reusing bsp_builder.ts's
buildBoxRoomBsp -- same box-room geometry idea (six axial wall planes, a
six-node chain, one quad face per wall, two leafs), just re-encoded at the
QBSP extended lump widths (see src/qcommon/qfiles.ts's Ext struct-reader
comments for the exact classic -> extended size table).

Self-sufficient per PORTING.md rule 13: this file's own beforeEach
initializes every global it reads (SetRefImports, Mod_Init, Mod_FreeAll,
SetNoTexture, SetQGL), matching test/gl_model.test.ts's identical setup.
*/

import { describe, test, expect, beforeEach } from "bun:test";
import type { RefImports } from "../src/client/ref";
import { SetRefImports, SetNoTexture, ImageT } from "../src/ref_gl/gl_local";
import { SetQGL } from "../src/ref_gl/gl_image";
import { QGLRecording } from "../src/ref_gl/qgl";
import { vec3 } from "../src/shared/math";
import { CONTENTS_SOLID } from "../src/shared/q_shared";
import { Mod_FreeAll, Mod_ForName, Mod_Init, Mod_PointInLeaf, ModtypeT, isMleaf, mod_known } from "../src/ref_gl/gl_model";
import {
  HEADER_LUMPS,
  LUMP_PLANES,
  LUMP_VERTEXES,
  LUMP_VISIBILITY,
  LUMP_NODES,
  LUMP_TEXINFO,
  LUMP_FACES,
  LUMP_LEAFS,
  LUMP_LEAFFACES,
  LUMP_EDGES,
  LUMP_SURFEDGES,
  LUMP_MODELS,
  DHEADER_T_SIZE,
  DPLANE_T_SIZE,
  DVERTEX_T_SIZE,
  TEXINFO_T_SIZE,
  DMODEL_T_SIZE,
  MAXLIGHTMAPS,
  IDBSPHEADER_EXT,
  BSPVERSION,
  DEDGE_EXT_T_SIZE,
  DFACE_EXT_T_SIZE,
  LEAFFACE_EXT_SIZE,
  DLEAF_EXT_T_SIZE,
  DNODE_EXT_T_SIZE,
  readDedgeExt,
  readDfaceExt,
  readUint32,
  readDleafExt,
  readDnodeExt,
  DSURF_PLANEBACK,
} from "../src/qcommon/qfiles";
import { buildBoxRoomBsp } from "./support/bsp_builder";

// ---------------------------------------------------------------------------
// fake `ri` -- same shape as test/gl_model.test.ts's own fake, duplicated
// here rather than shared (that file is owned elsewhere and not to be
// edited/imported for this).
// ---------------------------------------------------------------------------

const files = new Map<string, Uint8Array>();

function registerFile(name: string, data: Uint8Array): void {
  files.set(name, data);
}

function makeFakeRi(): RefImports {
  return {
    Sys_Error(_level: number, str: string): never {
      throw new Error(str);
    },
    Cmd_AddCommand: () => undefined,
    Cmd_RemoveCommand: () => undefined,
    Cmd_Argc: () => 0,
    Cmd_Argv: () => "",
    Cmd_ExecuteText: () => undefined,
    Con_Printf: () => undefined,
    FS_LoadFile: (name: string) => {
      const data = files.get(name);
      if (!data) return { length: -1, data: null };
      return { length: data.length, data };
    },
    FS_FreeFile: () => undefined,
    FS_Gamedir: () => "",
    Cvar_Get: () => null,
    Cvar_Set: () => null,
    Cvar_SetValue: () => undefined,
    Vid_GetModeInfo: () => null,
    Vid_MenuInit: () => undefined,
    Vid_NewWindow: () => undefined,
  };
}

beforeEach(() => {
  SetRefImports(makeFakeRi());
  Mod_Init();
  Mod_FreeAll(); // rule 13: other suites in this file cache models by name

  // Mod_FreeAll only clears slots whose extradatasize got set, which
  // Mod_ForName assigns AFTER the loader returns -- a test that
  // intentionally throws mid-load (this file's "Bad planenum" negative
  // test) leaves its slot's name set but extradatasize still 0, which
  // Mod_FreeAll's gate then skips. Forcibly clear every slot here so an
  // aborted load in one test never blocks the next test's own
  // "must be mod_known[0]" brush-model load (Mod_LoadBrushModel's own
  // world-model invariant).
  for (const m of mod_known) m.clear();

  // GL_FindImage (gl_image.ts) needs a fallback texture with real
  // dimensions, same as test/gl_model.test.ts's own beforeEach -- otherwise
  // GL_BuildPolygonFromSurface's `s /= image.width` divides by a null image.
  const fakeTex = new ImageT();
  fakeTex.width = 64;
  fakeTex.height = 64;
  SetNoTexture(fakeTex);

  // gl_rsurf.ts's GL_BeginBuildingLightmaps/GL_EndBuildingLightmaps call
  // into gl_image.ts's QGL binding while building Mod_LoadFacesExt's
  // lightmaps -- wire up a recording fake so brush model loading can run to
  // completion without a real GL context.
  SetQGL(new QGLRecording());
});

// ---------------------------------------------------------------------------
// Direct unit tests for qfiles.ts's QBSP extended-format struct readers:
// each hand-built record uses a value beyond what the classic 16-bit field
// could hold, verifying the widened decode.
// ---------------------------------------------------------------------------

describe("QBSP Ext struct readers: widened fields decode values beyond uint16", () => {
  test("readDedgeExt decodes vertnum values beyond 65535", () => {
    const buf = new Uint8Array(DEDGE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 70000, true);
    view.setUint32(4, 80000, true);
    const din = readDedgeExt(view, 0);
    expect(din.v).toEqual([70000, 80000]);
  });

  test("readDfaceExt decodes planenum/numedges/texinfo values beyond 65535 and masks drawflags to DSURF_PLANEBACK", () => {
    const buf = new Uint8Array(DFACE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 100000, true); // planenum
    view.setUint32(4, 0xffffffff, true); // drawflags: only bit 0 should survive the mask
    view.setInt32(8, 12345, true); // firstedge
    view.setUint32(12, 70000, true); // numedges
    view.setUint32(16, 90000, true); // texinfo
    for (let i = 0; i < 4; i++) view.setUint8(20 + i, i);
    view.setInt32(24, -1, true); // lightofs

    const din = readDfaceExt(view, 0);
    expect(din.planenum).toBe(100000);
    expect(din.drawflags).toBe(DSURF_PLANEBACK);
    expect(din.firstedge).toBe(12345);
    expect(din.numedges).toBe(70000);
    expect(din.texinfo).toBe(90000);
    expect(din.styles).toEqual([0, 1, 2, 3]);
    expect(din.lightofs).toBe(-1);
  });

  test("readUint32 decodes leafface/facenum values beyond 65535 (LeafFaces has no named struct, raw uint32 array)", () => {
    const buf = new Uint8Array(LEAFFACE_EXT_SIZE);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 102064, true); // beyond retail's own classic face-count ceiling
    expect(readUint32(view, 0)).toBe(102064);
  });

  test("readDleafExt decodes cluster/area/firstleafface values beyond 65535 and normalizes the null-cluster sentinel to -1", () => {
    const buf = new Uint8Array(DLEAF_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setInt32(0, CONTENTS_SOLID, true); // contents
    view.setUint32(4, 0xffffffff, true); // cluster: null sentinel
    view.setUint32(8, 200, true); // area
    for (let i = 0; i < 6; i++) view.setFloat32(12 + i * 4, 0, true); // mins/maxs
    view.setUint32(36, 94000, true); // firstleafface
    view.setUint32(40, 5, true); // numleaffaces
    view.setUint32(44, 0, true); // firstleafbrush
    view.setUint32(48, 0, true); // numleafbrushes

    const din = readDleafExt(view, 0);
    expect(din.cluster).toBe(-1);
    expect(din.area).toBe(200);
    expect(din.firstleafface).toBe(94000);
    expect(din.numleaffaces).toBe(5);
  });

  test("readDnodeExt decodes firstface/numfaces values beyond 65535", () => {
    const buf = new Uint8Array(DNODE_EXT_T_SIZE);
    const view = new DataView(buf.buffer);
    view.setInt32(0, 5, true); // planenum
    view.setInt32(4, 1, true); // children[0]
    view.setInt32(8, -1, true); // children[1]
    for (let i = 0; i < 6; i++) view.setFloat32(12 + i * 4, 0, true); // mins/maxs
    view.setUint32(36, 80000, true); // firstface
    view.setUint32(40, 12, true); // numfaces

    const din = readDnodeExt(view, 0);
    expect(din.planenum).toBe(5);
    expect(din.children).toEqual([1, -1]);
    expect(din.firstface).toBe(80000);
    expect(din.numfaces).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Hand-built QBSP-format box room: same geometry idea as
// test/support/bsp_builder.ts's buildBoxRoomBsp({renderable:true}) (six
// axial wall planes, a six-node chain -- node i's "inside" child continues
// the chain and its "outside" child goes straight to the solid leaf -- one
// inward-facing quad face per wall, two leafs), re-encoded at the QBSP
// extended lump widths and with ident IDBSPHEADER_EXT.
// ---------------------------------------------------------------------------

const ROOM_HALF = 64;
const SOLID_LEAF = 0;
const EMPTY_LEAF = 1;

interface WallPlane {
  normal: [number, number, number];
  dist: number;
  type: number;
}

function wallPlanes(): WallPlane[] {
  const h = ROOM_HALF;
  return [
    { normal: [-1, 0, 0], dist: -h, type: 3 }, // +X wall
    { normal: [1, 0, 0], dist: -h, type: 0 }, // -X wall
    { normal: [0, -1, 0], dist: -h, type: 4 }, // +Y wall
    { normal: [0, 1, 0], dist: -h, type: 1 }, // -Y wall
    { normal: [0, 0, -1], dist: -h, type: 5 }, // +Z wall
    { normal: [0, 0, 1], dist: -h, type: 2 }, // -Z wall
  ];
}

function wallAxes(): Array<{ s: [number, number, number]; t: [number, number, number] }> {
  return [
    { s: [0, 0, 1], t: [0, 1, 0] },
    { s: [0, 1, 0], t: [0, 0, 1] },
    { s: [1, 0, 0], t: [0, 0, 1] },
    { s: [0, 0, 1], t: [1, 0, 0] },
    { s: [0, 1, 0], t: [1, 0, 0] },
    { s: [1, 0, 0], t: [0, 1, 0] },
  ];
}

function wallCorners(i: number): Array<[number, number, number]> {
  const plane = wallPlanes()[i];
  const axes = wallAxes()[i];
  const h = ROOM_HALF;
  const center: [number, number, number] = [plane.normal[0] * plane.dist, plane.normal[1] * plane.dist, plane.normal[2] * plane.dist];
  const corner = (su: number, tv: number): [number, number, number] => [
    center[0] + axes.s[0] * su * h + axes.t[0] * tv * h,
    center[1] + axes.s[1] * su * h + axes.t[1] * tv * h,
    center[2] + axes.s[2] * su * h + axes.t[2] * tv * h,
  ];
  return [corner(-1, -1), corner(-1, 1), corner(1, 1), corner(1, -1)];
}

function buildLump(count: number, itemSize: number, write: (view: DataView, base: number, i: number) => void): Uint8Array {
  const buf = new Uint8Array(count * itemSize);
  const view = new DataView(buf.buffer);
  for (let i = 0; i < count; i++) write(view, i * itemSize, i);
  return buf;
}

function writeFixedString(view: DataView, base: number, s: string, maxLen: number): void {
  for (let i = 0; i < maxLen; i++) {
    view.setUint8(base + i, i < s.length ? s.charCodeAt(i) : 0);
  }
}

interface QbspRoomOptions {
  // corrupts face 0's on-disk planenum to a value >= numplanes, exercising
  // Mod_LoadFacesExt's "Bad planenum" cross-reference check.
  badFacePlanenum?: boolean;
}

function buildQbspRoomBsp(options: QbspRoomOptions = {}): Uint8Array {
  const planes = wallPlanes();
  const axes = wallAxes();
  const nodeCount = 6;

  // ---- PLANES (6): byte-identical to classic, DPLANE_T_SIZE ----
  const planesLump = buildLump(planes.length, DPLANE_T_SIZE, (view, base, i) => {
    const p = planes[i];
    view.setFloat32(base, p.normal[0], true);
    view.setFloat32(base + 4, p.normal[1], true);
    view.setFloat32(base + 8, p.normal[2], true);
    view.setFloat32(base + 12, p.dist, true);
    view.setInt32(base + 16, p.type, true);
  });

  // ---- NODES (6) at DNODE_EXT_T_SIZE: planenum/children stay signed 4-byte
  // reads, mins/maxs widen to float32, firstface/numfaces widen to uint32.
  // Same chain topology as bsp_builder's buildBoxRoomBsp: node i's "inside so
  // far" child continues to node i+1 (or the empty leaf on the last node);
  // its "outside this wall" child goes straight to the solid leaf. Each node
  // owns exactly the one face for its own wall.
  const nodesLump = buildLump(nodeCount, DNODE_EXT_T_SIZE, (view, base, i) => {
    const insideChild = i === nodeCount - 1 ? -1 - EMPTY_LEAF : i + 1;
    const outsideChild = -1 - SOLID_LEAF;
    view.setInt32(base, i, true); // planenum
    view.setInt32(base + 4, insideChild, true); // children[0]
    view.setInt32(base + 8, outsideChild, true); // children[1]
    view.setFloat32(base + 12, -ROOM_HALF, true); // mins
    view.setFloat32(base + 16, -ROOM_HALF, true);
    view.setFloat32(base + 20, -ROOM_HALF, true);
    view.setFloat32(base + 24, ROOM_HALF, true); // maxs
    view.setFloat32(base + 28, ROOM_HALF, true);
    view.setFloat32(base + 32, ROOM_HALF, true);
    view.setUint32(base + 36, i, true); // firstface
    view.setUint32(base + 40, 1, true); // numfaces
  });

  // ---- TEXINFO (6): byte-identical to classic, one entry per wall's own
  // (s, t) axes (no dummy entry 0 needed -- gl_model.ts never reads
  // brushsides, unlike bsp_builder's cmodel-oriented layout). ----
  const texinfoLump = buildLump(6, TEXINFO_T_SIZE, (view, base, i) => {
    const sAxis = axes[i].s;
    const tAxis = axes[i].t;
    view.setFloat32(base, sAxis[0], true);
    view.setFloat32(base + 4, sAxis[1], true);
    view.setFloat32(base + 8, sAxis[2], true);
    view.setFloat32(base + 12, 0, true);
    view.setFloat32(base + 16, tAxis[0], true);
    view.setFloat32(base + 20, tAxis[1], true);
    view.setFloat32(base + 24, tAxis[2], true);
    view.setFloat32(base + 28, 0, true);
    view.setInt32(base + 32, 0, true); // flags
    view.setInt32(base + 36, 0, true); // value
    writeFixedString(view, base + 40, "wall", 32); // texture
    view.setInt32(base + 72, -1, true); // nexttexinfo
  });

  // ---- VERTEXES (24): byte-identical to classic ----
  const vertexesLump = buildLump(24, DVERTEX_T_SIZE, (view, base, i) => {
    const wall = (i / 4) | 0;
    const corner = i % 4;
    const p = wallCorners(wall)[corner];
    view.setFloat32(base, p[0], true);
    view.setFloat32(base + 4, p[1], true);
    view.setFloat32(base + 8, p[2], true);
  });

  // ---- EDGES (25) at DEDGE_EXT_T_SIZE: v[0]/v[1] widen to uint32. Edge 0 is
  // a reserved dummy (a surfedge of 0 has no sign, so cannot name a real
  // edge). ----
  const edgesLump = buildLump(25, DEDGE_EXT_T_SIZE, (view, base, i) => {
    if (i === 0) {
      view.setUint32(base, 0, true);
      view.setUint32(base + 4, 0, true);
      return;
    }
    const e = i - 1;
    const face = (e / 4) | 0;
    const corner = e % 4;
    view.setUint32(base, face * 4 + corner, true);
    view.setUint32(base + 4, face * 4 + ((corner + 1) % 4), true);
  });

  // ---- SURFEDGES (24): byte-identical to classic (always plain int32) ----
  const surfedgesLump = buildLump(24, 4, (view, base, i) => {
    view.setInt32(base, i + 1, true); // edge i+1, forward
  });

  // ---- FACES (6) at DFACE_EXT_T_SIZE: planenum/numedges/texinfo widen to
  // uint32, side->drawflags (masked to DSURF_PLANEBACK, left 0 here: every
  // wall face is front-facing). ----
  const facesLump = buildLump(6, DFACE_EXT_T_SIZE, (view, base, i) => {
    const planenum = options.badFacePlanenum && i === 0 ? 999 : i;
    view.setUint32(base, planenum, true); // planenum
    view.setUint32(base + 4, 0, true); // drawflags
    view.setInt32(base + 8, i * 4, true); // firstedge (index into SURFEDGES)
    view.setUint32(base + 12, 4, true); // numedges
    view.setUint32(base + 16, i, true); // texinfo
    for (let j = 0; j < MAXLIGHTMAPS; j++) view.setUint8(base + 20 + j, j === 0 ? 0 : 255); // styles
    view.setInt32(base + 24, -1, true); // lightofs: no lightmap data
  });

  // ---- LEAFFACES (6) at LEAFFACE_EXT_SIZE: raw uint32 facenum array, all
  // six owned by the empty leaf. ----
  const leaffacesLump = buildLump(6, LEAFFACE_EXT_SIZE, (view, base, i) => {
    view.setUint32(base, i, true);
  });

  // ---- LEAFS (2) at DLEAF_EXT_T_SIZE: leaf 0 solid (null-cluster sentinel),
  // leaf 1 empty (cluster 0, owns all six leaffaces). ----
  const leafsLump = buildLump(2, DLEAF_EXT_T_SIZE, (view, base, i) => {
    const solid = i === SOLID_LEAF;
    view.setInt32(base, solid ? CONTENTS_SOLID : 0, true); // contents
    view.setUint32(base + 4, solid ? 0xffffffff : 0, true); // cluster
    view.setUint32(base + 8, 0, true); // area
    view.setFloat32(base + 12, -ROOM_HALF, true); // mins
    view.setFloat32(base + 16, -ROOM_HALF, true);
    view.setFloat32(base + 20, -ROOM_HALF, true);
    view.setFloat32(base + 24, ROOM_HALF, true); // maxs
    view.setFloat32(base + 28, ROOM_HALF, true);
    view.setFloat32(base + 32, ROOM_HALF, true);
    view.setUint32(base + 36, 0, true); // firstleafface
    view.setUint32(base + 40, solid ? 0 : 6, true); // numleaffaces
    view.setUint32(base + 44, 0, true); // firstleafbrush (unread by gl_model.ts)
    view.setUint32(base + 48, 0, true); // numleafbrushes (unread by gl_model.ts)
  });

  // ---- MODELS (1): byte-identical to classic, the whole room rooted at
  // node 0. ----
  const modelsLump = buildLump(1, DMODEL_T_SIZE, (view, base) => {
    const h = ROOM_HALF;
    view.setFloat32(base, -h, true);
    view.setFloat32(base + 4, -h, true);
    view.setFloat32(base + 8, -h, true);
    view.setFloat32(base + 12, h, true);
    view.setFloat32(base + 16, h, true);
    view.setFloat32(base + 20, h, true);
    view.setFloat32(base + 24, 0, true); // origin
    view.setFloat32(base + 28, 0, true);
    view.setFloat32(base + 32, 0, true);
    view.setInt32(base + 36, 0, true); // headnode
    view.setInt32(base + 40, 0, true); // firstface (unused)
    view.setInt32(base + 44, 0, true); // numfaces (unused)
  });

  // ---- VISIBILITY: header only (numclusters=1, one bitofs[PVS/PHS] pair);
  // Mod_LoadLeafsExt validates the empty leaf's cluster (0) against this
  // count. Compressed PVS/PHS bit data is not needed -- no test here
  // decompresses it. ----
  const visLump = (() => {
    const buf = new Uint8Array(4 + 1 * 2 * 4);
    const view = new DataView(buf.buffer);
    view.setInt32(0, 1, true); // numclusters
    view.setInt32(4, 0, true); // bitofs[0][DVIS_PVS]
    view.setInt32(8, 0, true); // bitofs[0][DVIS_PHS]
    return buf;
  })();

  const empty = new Uint8Array(0);

  const lumpOrder: Array<{ index: number; data: Uint8Array }> = [
    { index: LUMP_PLANES, data: planesLump },
    { index: LUMP_VERTEXES, data: vertexesLump },
    { index: LUMP_VISIBILITY, data: visLump },
    { index: LUMP_NODES, data: nodesLump },
    { index: LUMP_TEXINFO, data: texinfoLump },
    { index: LUMP_FACES, data: facesLump },
    { index: LUMP_LEAFS, data: leafsLump },
    { index: LUMP_LEAFFACES, data: leaffacesLump },
    { index: LUMP_EDGES, data: edgesLump },
    { index: LUMP_SURFEDGES, data: surfedgesLump },
    { index: LUMP_MODELS, data: modelsLump },
  ];

  const lumpInfo: Array<{ fileofs: number; filelen: number }> = Array.from({ length: HEADER_LUMPS }, () => ({ fileofs: DHEADER_T_SIZE, filelen: 0 }));
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

  // header: ident IDBSPHEADER_EXT ('QBSP') selects the extended branch
  outView.setInt32(0, IDBSPHEADER_EXT, true);
  outView.setInt32(4, BSPVERSION, true);
  for (let i = 0; i < HEADER_LUMPS; i++) {
    const info = lumpInfo[i];
    outView.setInt32(8 + i * 8, info.fileofs, true);
    outView.setInt32(8 + i * 8 + 4, info.filelen, true);
  }

  return out;
}

// ---------------------------------------------------------------------------
// End-to-end: load the QBSP room through the real Mod_ForName and assert it
// produces the same kind of node/leaf/surface structure a classic-format
// version of the same room would (see test/gl_model.test.ts's own box-room
// assertions for the classic-format counterpart).
// ---------------------------------------------------------------------------

describe("Mod_LoadBrushModel: QBSP extended-format room loads through Mod_ForName", () => {
  test("loads planes/nodes/leafs/faces/edges/submodels and walks the node/leaf tree correctly", () => {
    const name = "maps/qbsproom.bsp";
    registerFile(name, buildQbspRoomBsp());

    const model = Mod_ForName(name, false);
    expect(model).not.toBeNull();
    if (!model) throw new Error("model not returned");

    expect(model.type).toBe(ModtypeT.mod_brush);
    expect(model.numplanes).toBe(6);
    expect(model.numnodes).toBe(6);
    expect(model.numleafs).toBe(2);
    expect(model.numsurfaces).toBe(6);
    expect(model.numedges).toBe(25);
    expect(model.numsurfedges).toBe(24);
    expect(model.numvertexes).toBe(24);
    expect(model.nummarksurfaces).toBe(6);
    expect(model.numsubmodels).toBe(1);

    // Mod_LoadFacesExt still runs the same GL polygon/lightmap build as the
    // classic loader -- one GlpolyT per face with vert count == numedges.
    for (const surf of model.surfaces) {
      expect(surf.numedges).toBe(4);
      expect(surf.polys).not.toBeNull();
      if (!surf.polys) continue;
      expect(surf.polys.numverts).toBe(4);
      expect(surf.polys.verts.length).toBe(4);
    }

    const insideLeaf = Mod_PointInLeaf(vec3(0, 0, 0), model);
    expect(isMleaf(insideLeaf)).toBe(true);
    expect(insideLeaf.contents & CONTENTS_SOLID).toBe(0);
    expect(insideLeaf.cluster).toBe(0); // empty leaf: validated against the vis header's numclusters

    const wallLeaf = Mod_PointInLeaf(vec3(200, 0, 0), model);
    expect(isMleaf(wallLeaf)).toBe(true);
    expect(wallLeaf.contents & CONTENTS_SOLID).toBe(CONTENTS_SOLID);
    expect(wallLeaf.cluster).toBe(-1); // solid leaf: null-cluster sentinel normalized to -1
  });
});

// ---------------------------------------------------------------------------
// Negative test: a malformed Ext record throws the expected Sys_Error
// message.
// ---------------------------------------------------------------------------

describe("Mod_LoadFacesExt: malformed record throws Sys_Error", () => {
  test("out-of-range planenum throws 'Bad planenum'", () => {
    const name = "maps/qbsp_badplanenum.bsp";
    registerFile(name, buildQbspRoomBsp({ badFacePlanenum: true }));
    expect(() => Mod_ForName(name, false)).toThrow(/Bad planenum/);
  });
});

// ---------------------------------------------------------------------------
// Regression check: classic-format (IBSP) loading is unaffected by the QBSP
// branch added to Mod_LoadBrushModel. Light sanity check only -- the full
// classic-format suite already lives in test/gl_model.test.ts.
// ---------------------------------------------------------------------------

describe("Mod_LoadBrushModel: classic IBSP format still loads (regression check)", () => {
  test("classic-format box room loads unaffected by the QBSP branch", () => {
    const name = "maps/classicroom.bsp";
    registerFile(name, buildBoxRoomBsp(undefined, { renderable: true }));

    const model = Mod_ForName(name, false);
    expect(model).not.toBeNull();
    if (!model) throw new Error("model not returned");

    expect(model.type).toBe(ModtypeT.mod_brush);
    expect(model.numplanes).toBe(6);
    expect(model.numnodes).toBe(6);
    expect(model.numleafs).toBe(2);
    expect(model.numsurfaces).toBe(6);
    expect(model.numedges).toBe(25);
  });
});
