/*
Test support for src/ref_soft/r_model.ts's QBSP extended-format ("Ext")
brush-model loader added alongside the existing classic IBSP loader
(Mod_LoadEdgesExt/Mod_LoadFacesExt/Mod_LoadMarksurfacesExt/Mod_LoadLeafsExt/
Mod_LoadNodesExt, dispatched from Mod_LoadBrushModel by header ident).

Self-contained per PORTING.md's "test files are self-sufficient" rule and
this unit's brief: does NOT import or extend test/support/bsp_builder.ts
(that file is shaped for cmodel.ts's collision lumps and is owned
elsewhere) -- every BSP buffer below is built inline, byte-by-byte, from
src/qcommon/qfiles.ts's exported struct sizes/readers.

Four kinds of coverage, per the brief:
  1. Pure decode tests for each new Ext struct reader (qfiles.ts's
     readDedgeExt/readDfaceExt/readUint32/readDleafExt/readDnodeExt),
     proving a value that would overflow the classic format's 16-bit field
     round-trips correctly through the widened 32-bit one.
  2. An end-to-end test: a renderable QBSP (extended) box room, loaded
     through the real Mod_ForName via the same GetRefAPI/r_local harness
     style test/ref_frame.test.ts uses to drive this renderer's model
     loading, asserting the same surface/node/leaf counts a classic-format
     version of the same room produces (see that file's own assertions).
  3. A negative test: a QBSP Nodes record with an out-of-range planenum,
     asserting Mod_LoadNodesExt throws bsp.c's own "Bad planenum" message.
  4. A light classic-format regression check, confirming the unchanged
     classic branch of Mod_LoadBrushModel still works after the ident
     dispatch was added.

State-leak note (caught before it bit this file too -- flagged by the
sibling gl_model.ts port's own test run): Mod_ForName sets `mod.name`
*before* calling the format loader, and only sets `mod.extradatasize`
*after* the loader returns successfully. Mod_FreeAll() only clears a
mod_known slot when extradatasize is already nonzero, so a test whose
load throws mid-parse (the negative test below) would leave mod_known[0]
half-initialized -- occupying "name set, extradatasize 0" -- and bump the
next Mod_ForName call in a later test onto mod_known[1], tripping
Mod_LoadBrushModel's own "Loaded a brush model after the world" invariant
(only slot 0 may hold a world/brush model). resetModels() below force-clears
every slot directly instead of going through Mod_FreeAll(), sidestepping
that gate entirely.
*/

import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import type { RefImports, RefExports } from "../src/client/ref";
import { CvarT } from "../src/shared/q_shared";
import { CONTENTS_SOLID } from "../src/shared/q_shared";
import { SetRefImports, r_worldmodel } from "../src/ref_soft/r_local";
import { GetRefAPI } from "../src/ref_soft/r_main";
import { VID_Init } from "../src/platform/vid";
import { Mod_ForName, Mod_Init, mod_known, mod_inline, SURF_PLANEBACK } from "../src/ref_soft/r_model";
import { buildColormapPcx } from "./support/colormap_builder";
import {
  HEADER_LUMPS,
  LUMP_ENTITIES,
  LUMP_PLANES,
  LUMP_VERTEXES,
  LUMP_VISIBILITY,
  LUMP_NODES,
  LUMP_TEXINFO,
  LUMP_FACES,
  LUMP_LIGHTING,
  LUMP_LEAFS,
  LUMP_LEAFFACES,
  LUMP_LEAFBRUSHES,
  LUMP_EDGES,
  LUMP_SURFEDGES,
  LUMP_MODELS,
  LUMP_BRUSHES,
  LUMP_BRUSHSIDES,
  LUMP_POP,
  LUMP_AREAS,
  LUMP_AREAPORTALS,
  IDBSPHEADER,
  IDBSPHEADER_EXT,
  BSPVERSION,
  DHEADER_T_SIZE,
  DMODEL_T_SIZE,
  DPLANE_T_SIZE,
  DNODE_T_SIZE,
  DNODE_EXT_T_SIZE,
  DLEAF_T_SIZE,
  DLEAF_EXT_T_SIZE,
  DVERTEX_T_SIZE,
  DEDGE_T_SIZE,
  DEDGE_EXT_T_SIZE,
  DFACE_T_SIZE,
  DFACE_EXT_T_SIZE,
  LEAFFACE_EXT_SIZE,
  TEXINFO_T_SIZE,
  MAXLIGHTMAPS,
  DSURF_PLANEBACK,
  readDedgeExt,
  readDfaceExt,
  readDleafExt,
  readDnodeExt,
  readUint32,
} from "../src/qcommon/qfiles";

// ===========================================================================
// shared file-registry fake FS, used by both the lightweight harness (direct
// Mod_ForName calls) and the GetRefAPI harness below. Names never collide
// across sections.
// ===========================================================================

const files = new Map<string, Uint8Array>();

function registerFile(name: string, data: Uint8Array): void {
  files.set(name, data);
}

// ===========================================================================
// lightweight fake `ri` (no VID_Init/image system) -- same shape as
// test/ref_model.test.ts's makeFakeRi, duplicated here per this file's own
// self-sufficiency rule.
// ===========================================================================

function makeLightFakeRi(): RefImports {
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

// force-clears every mod_known/mod_inline slot directly, instead of
// Mod_FreeAll() (which only clears slots with a nonzero extradatasize --
// see file header note on why that gate is unsafe after a throwing load).
function resetModels(): void {
  Mod_Init();
  for (const m of mod_known) m.clear();
  for (const m of mod_inline) m.clear();
}

// ===========================================================================
// shared box-room geometry + lump builders. Mirrors the shape of
// test/support/bsp_builder.ts's buildBoxRoomBsp (six wall planes, a six-node
// chain, one quad face per wall) but is written fresh here, with an
// `extended` switch so the same geometry can be encoded at either the
// classic or QBSP widths for the E()-tagged lumps (Edges/Faces/LeafFaces/
// Leafs/Nodes). Planes/Texinfo/Vertexes/SurfEdges/Lighting/Models are
// byte-identical between formats and are written once.
// ===========================================================================

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
    { s: [0, 0, 1], t: [0, 1, 0] }, // +X wall
    { s: [0, 1, 0], t: [0, 0, 1] }, // -X wall
    { s: [1, 0, 0], t: [0, 0, 1] }, // +Y wall
    { s: [0, 0, 1], t: [1, 0, 0] }, // -Y wall
    { s: [0, 1, 0], t: [1, 0, 0] }, // +Z wall
    { s: [1, 0, 0], t: [0, 1, 0] }, // -Z wall
  ];
}

// wound the same direction test/support/bsp_builder.ts's wallCorners uses
// (see that file's comment): clockwise about the wall's inward normal, or
// R_GenerateSpans reads an inverted span and the surface produces none.
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
  for (let i = 0; i < maxLen; i++) view.setUint8(base + i, i < s.length ? s.charCodeAt(i) : 0);
}

function stringBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function assembleHeader(ident: number, lumpOrder: Array<{ index: number; data: Uint8Array }>): Uint8Array {
  const lumpInfo: Array<{ fileofs: number; filelen: number }> = new Array(HEADER_LUMPS);
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

  outView.setInt32(0, ident, true);
  outView.setInt32(4, BSPVERSION, true);
  for (let i = 0; i < HEADER_LUMPS; i++) {
    const info = lumpInfo[i];
    outView.setInt32(8 + i * 8, info.fileofs, true);
    outView.setInt32(8 + i * 8 + 4, info.filelen, true);
  }
  return out;
}

interface BoxRoomOpts {
  extended: boolean;
  renderable?: boolean;
}

// six wall planes / a six-node chain / two leafs / one submodel; renderable
// adds the vertex/edge/surfedge/face/leafface lumps needed to hang a real
// quad off each wall, exactly like bsp_builder.ts's own `renderable` option
// -- but with the E()-tagged lumps encoded at whichever width `extended`
// selects.
function buildBoxRoomBsp(opts: BoxRoomOpts): Uint8Array {
  const { extended, renderable = true } = opts;
  const planes = wallPlanes();
  const axes = wallAxes();
  const empty = new Uint8Array(0);

  const planesLump = buildLump(planes.length, DPLANE_T_SIZE, (view, base, i) => {
    const p = planes[i];
    view.setFloat32(base, p.normal[0], true);
    view.setFloat32(base + 4, p.normal[1], true);
    view.setFloat32(base + 8, p.normal[2], true);
    view.setFloat32(base + 12, p.dist, true);
    view.setInt32(base + 16, p.type, true);
  });

  const nodeCount = 6;
  const nodeSize = extended ? DNODE_EXT_T_SIZE : DNODE_T_SIZE;
  const nodesLump = buildLump(nodeCount, nodeSize, (view, base, i) => {
    const insideChild = i === nodeCount - 1 ? -1 - EMPTY_LEAF : i + 1;
    const outsideChild = -1 - SOLID_LEAF;
    const b = renderable ? ROOM_HALF : 0;
    view.setInt32(base, i, true); // planenum: 4-byte signed in both formats
    view.setInt32(base + 4, insideChild, true);
    view.setInt32(base + 8, outsideChild, true);
    if (extended) {
      view.setFloat32(base + 12, -b, true);
      view.setFloat32(base + 16, -b, true);
      view.setFloat32(base + 20, -b, true);
      view.setFloat32(base + 24, b, true);
      view.setFloat32(base + 28, b, true);
      view.setFloat32(base + 32, b, true);
      view.setUint32(base + 36, renderable ? i : 0, true); // firstface
      view.setUint32(base + 40, renderable ? 1 : 0, true); // numfaces
    } else {
      view.setInt16(base + 12, -b, true);
      view.setInt16(base + 14, -b, true);
      view.setInt16(base + 16, -b, true);
      view.setInt16(base + 18, b, true);
      view.setInt16(base + 20, b, true);
      view.setInt16(base + 22, b, true);
      view.setUint16(base + 24, renderable ? i : 0, true);
      view.setUint16(base + 26, renderable ? 1 : 0, true);
    }
  });

  // entry 0 is a dummy; entries 1..6 carry each wall's own (s, t) axes
  const texinfoLump = !renderable
    ? empty
    : buildLump(7, TEXINFO_T_SIZE, (view, base, i) => {
        const sAxis = i === 0 ? [1, 0, 0] : axes[i - 1].s;
        const tAxis = i === 0 ? [0, 1, 0] : axes[i - 1].t;
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
        writeFixedString(view, base + 40, "wall", 32); // texture ("textures/wall.wal", deliberately absent from `files`)
        view.setInt32(base + 72, -1, true); // nexttexinfo
      });

  const vertexesLump = !renderable
    ? empty
    : buildLump(24, DVERTEX_T_SIZE, (view, base, i) => {
        const p = wallCorners((i / 4) | 0)[i % 4];
        view.setFloat32(base, p[0], true);
        view.setFloat32(base + 4, p[1], true);
        view.setFloat32(base + 8, p[2], true);
      });

  // edge 0 is a reserved dummy: a surfedge of 0 has no sign, so cannot name a real edge
  const edgeSize = extended ? DEDGE_EXT_T_SIZE : DEDGE_T_SIZE;
  const edgesLump = !renderable
    ? empty
    : buildLump(25, edgeSize, (view, base, i) => {
        const setV = (a: number, b: number) => {
          if (extended) {
            view.setUint32(base, a, true);
            view.setUint32(base + 4, b, true);
          } else {
            view.setUint16(base, a, true);
            view.setUint16(base + 2, b, true);
          }
        };
        if (i === 0) {
          setV(0, 0);
          return;
        }
        const e = i - 1;
        const face = (e / 4) | 0;
        const corner = e % 4;
        setV(face * 4 + corner, face * 4 + ((corner + 1) % 4));
      });

  // format-identical between classic and QBSP
  const surfedgesLump = !renderable
    ? empty
    : buildLump(24, 4, (view, base, i) => {
        view.setInt32(base, i + 1, true); // edge i+1, forward
      });

  const faceSize = extended ? DFACE_EXT_T_SIZE : DFACE_T_SIZE;
  const facesLump = !renderable
    ? empty
    : buildLump(6, faceSize, (view, base, i) => {
        if (extended) {
          view.setUint32(base, i, true); // planenum
          view.setUint32(base + 4, 0, true); // drawflags: front (0), normal points into the room
          view.setInt32(base + 8, i * 4, true); // firstedge (into SURFEDGES)
          view.setUint32(base + 12, 4, true); // numedges
          view.setUint32(base + 16, i + 1, true); // texinfo
          for (let j = 0; j < MAXLIGHTMAPS; j++) view.setUint8(base + 20 + j, j === 0 ? 0 : 255);
          view.setInt32(base + 24, -1, true); // lightofs: no lightmap data
        } else {
          view.setUint16(base, i, true);
          view.setInt16(base + 2, 0, true);
          view.setInt32(base + 4, i * 4, true);
          view.setInt16(base + 8, 4, true);
          view.setInt16(base + 10, i + 1, true);
          for (let j = 0; j < MAXLIGHTMAPS; j++) view.setUint8(base + 12 + j, j === 0 ? 0 : 255);
          view.setInt32(base + 16, -1, true);
        }
      });

  const leaffaceSize = extended ? LEAFFACE_EXT_SIZE : 2;
  const leaffacesLump = !renderable
    ? empty
    : buildLump(6, leaffaceSize, (view, base, i) => {
        if (extended) view.setUint32(base, i, true);
        else view.setUint16(base, i, true);
      });

  // leaf 0 solid, leaf 1 empty (owns all six leaffaces when renderable)
  const leafSize = extended ? DLEAF_EXT_T_SIZE : DLEAF_T_SIZE;
  const leafsLump = buildLump(2, leafSize, (view, base, i) => {
    const solid = i === SOLID_LEAF;
    const b = renderable ? ROOM_HALF : 0;
    if (extended) {
      view.setInt32(base, solid ? CONTENTS_SOLID : 0, true); // contents
      view.setUint32(base + 4, solid ? 0xffffffff : 0, true); // cluster (-1 sentinel for solid)
      view.setUint32(base + 8, solid ? 0 : 1, true); // area
      view.setFloat32(base + 12, -b, true);
      view.setFloat32(base + 16, -b, true);
      view.setFloat32(base + 20, -b, true);
      view.setFloat32(base + 24, b, true);
      view.setFloat32(base + 28, b, true);
      view.setFloat32(base + 32, b, true);
      view.setUint32(base + 36, 0, true); // firstleafface
      view.setUint32(base + 40, renderable && !solid ? 6 : 0, true); // numleaffaces
      view.setUint32(base + 44, 0, true); // firstleafbrush (unread by r_model.ts)
      view.setUint32(base + 48, 0, true); // numleafbrushes (unread by r_model.ts)
    } else {
      view.setInt32(base, solid ? CONTENTS_SOLID : 0, true);
      view.setInt16(base + 4, solid ? -1 : 0, true);
      view.setInt16(base + 6, solid ? 0 : 1, true);
      view.setInt16(base + 8, -b, true);
      view.setInt16(base + 10, -b, true);
      view.setInt16(base + 12, -b, true);
      view.setInt16(base + 14, b, true);
      view.setInt16(base + 16, b, true);
      view.setInt16(base + 18, b, true);
      view.setUint16(base + 20, 0, true);
      view.setUint16(base + 22, renderable && !solid ? 6 : 0, true);
      view.setUint16(base + 24, 0, true);
      view.setUint16(base + 26, 0, true);
    }
  });

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

  const entitiesLump = stringBytes('{\n"classname" "worldspawn"\n}\n');

  const lumpOrder: Array<{ index: number; data: Uint8Array }> = [
    { index: LUMP_ENTITIES, data: entitiesLump },
    { index: LUMP_PLANES, data: planesLump },
    { index: LUMP_VERTEXES, data: vertexesLump },
    { index: LUMP_VISIBILITY, data: empty },
    { index: LUMP_NODES, data: nodesLump },
    { index: LUMP_TEXINFO, data: texinfoLump },
    { index: LUMP_FACES, data: facesLump },
    { index: LUMP_LIGHTING, data: empty },
    { index: LUMP_LEAFS, data: leafsLump },
    { index: LUMP_LEAFFACES, data: leaffacesLump },
    { index: LUMP_LEAFBRUSHES, data: empty },
    { index: LUMP_EDGES, data: edgesLump },
    { index: LUMP_SURFEDGES, data: surfedgesLump },
    { index: LUMP_MODELS, data: modelsLump },
    { index: LUMP_BRUSHES, data: empty },
    { index: LUMP_BRUSHSIDES, data: empty },
    { index: LUMP_POP, data: empty },
    { index: LUMP_AREAS, data: empty },
    { index: LUMP_AREAPORTALS, data: empty },
  ];

  return assembleHeader(extended ? IDBSPHEADER_EXT : IDBSPHEADER, lumpOrder);
}

// minimal QBSP buffer for the negative test: one plane, one node whose
// planenum (99) is out of range for a one-plane map, two leafs, one
// submodel. Every other lump is empty, so the extended load sequence
// (Visibility -> Planes -> Texinfo -> Lighting -> Vertexes -> EdgesExt ->
// SurfEdges -> FacesExt -> MarksurfacesExt -> LeafsExt -> NodesExt) reaches
// Mod_LoadNodesExt (the last Ext loader before Submodels) with everything
// it needs already loaded, and throws there.
function buildBadPlanenumQbsp(): Uint8Array {
  const empty = new Uint8Array(0);

  const planesLump = buildLump(1, DPLANE_T_SIZE, (view, base) => {
    view.setFloat32(base, 1, true);
    view.setFloat32(base + 4, 0, true);
    view.setFloat32(base + 8, 0, true);
    view.setFloat32(base + 12, 0, true);
    view.setInt32(base + 16, 0, true);
  });

  const nodesLump = buildLump(1, DNODE_EXT_T_SIZE, (view, base) => {
    view.setInt32(base, 99, true); // planenum: out of range, numplanes is 1
    view.setInt32(base + 4, -1 - EMPTY_LEAF, true);
    view.setInt32(base + 8, -1 - SOLID_LEAF, true);
    for (let i = 0; i < 6; i++) view.setFloat32(base + 12 + i * 4, 0, true);
    view.setUint32(base + 36, 0, true);
    view.setUint32(base + 40, 0, true);
  });

  const leafsLump = buildLump(2, DLEAF_EXT_T_SIZE, (view, base, i) => {
    const solid = i === SOLID_LEAF;
    view.setInt32(base, solid ? CONTENTS_SOLID : 0, true);
    view.setUint32(base + 4, solid ? 0xffffffff : 0, true);
    view.setUint32(base + 8, 0, true);
    for (let j = 0; j < 6; j++) view.setFloat32(base + 12 + j * 4, 0, true);
    view.setUint32(base + 36, 0, true);
    view.setUint32(base + 40, 0, true);
    view.setUint32(base + 44, 0, true);
    view.setUint32(base + 48, 0, true);
  });

  const modelsLump = buildLump(1, DMODEL_T_SIZE, (view, base) => {
    view.setInt32(base + 36, 0, true); // headnode
  });

  const lumpOrder: Array<{ index: number; data: Uint8Array }> = [
    { index: LUMP_ENTITIES, data: empty },
    { index: LUMP_PLANES, data: planesLump },
    { index: LUMP_VERTEXES, data: empty },
    { index: LUMP_VISIBILITY, data: empty },
    { index: LUMP_NODES, data: nodesLump },
    { index: LUMP_TEXINFO, data: empty },
    { index: LUMP_FACES, data: empty },
    { index: LUMP_LIGHTING, data: empty },
    { index: LUMP_LEAFS, data: leafsLump },
    { index: LUMP_LEAFFACES, data: empty },
    { index: LUMP_LEAFBRUSHES, data: empty },
    { index: LUMP_EDGES, data: empty },
    { index: LUMP_SURFEDGES, data: empty },
    { index: LUMP_MODELS, data: modelsLump },
    { index: LUMP_BRUSHES, data: empty },
    { index: LUMP_BRUSHSIDES, data: empty },
    { index: LUMP_POP, data: empty },
    { index: LUMP_AREAS, data: empty },
    { index: LUMP_AREAPORTALS, data: empty },
  ];

  return assembleHeader(IDBSPHEADER_EXT, lumpOrder);
}

// ===========================================================================
// 1. parse-vector unit tests: each new Ext struct reader (qfiles.ts, not
// edited by this port) decodes a value that would overflow the classic
// format's 16-bit field but fits the widened 32-bit one.
// ===========================================================================

describe("QBSP extended-format struct decoding (qfiles.ts readers)", () => {
  test("readDedgeExt: vertex indices past the classic uint16 ceiling (0xffff)", () => {
    const buf = new ArrayBuffer(DEDGE_EXT_T_SIZE);
    const view = new DataView(buf);
    view.setUint32(0, 70000, true);
    view.setUint32(4, 238613, true); // retail's own worst-case vert count minus one
    const din = readDedgeExt(view, 0);
    expect(din.v).toEqual([70000, 238613]);
  });

  test("readDfaceExt: planenum/numedges/texinfo past the classic uint16 ceiling; drawflags pre-masked to DSURF_PLANEBACK", () => {
    const buf = new ArrayBuffer(DFACE_EXT_T_SIZE);
    const view = new DataView(buf);
    view.setUint32(0, 90000, true); // planenum
    view.setUint32(4, 0xffffffff, true); // drawflags: only bit 0 should survive the DSURF_PLANEBACK mask
    view.setInt32(8, 307372, true); // firstedge
    view.setUint32(12, 80000, true); // numedges
    view.setUint32(16, 70001, true); // texinfo
    for (let i = 0; i < 4; i++) view.setUint8(20 + i, i);
    view.setInt32(24, -1, true); // lightofs
    const din = readDfaceExt(view, 0);
    expect(din.planenum).toBe(90000);
    expect(din.drawflags).toBe(DSURF_PLANEBACK);
    expect(din.firstedge).toBe(307372);
    expect(din.numedges).toBe(80000);
    expect(din.texinfo).toBe(70001);
    expect(din.styles).toEqual([0, 1, 2, 3]);
    expect(din.lightofs).toBe(-1);
  });

  test("readUint32 (LeafFaces): a facenum past the classic uint16 ceiling", () => {
    const buf = new ArrayBuffer(LEAFFACE_EXT_SIZE);
    const view = new DataView(buf);
    view.setUint32(0, 102063, true); // retail's own worst-case face count minus one
    expect(readUint32(view, 0)).toBe(102063);
  });

  test("readDleafExt: cluster/area/leafface span past the classic uint16 ceiling, with -1 sentinel normalization", () => {
    const buf = new ArrayBuffer(DLEAF_EXT_T_SIZE);
    const view = new DataView(buf);
    view.setInt32(0, CONTENTS_SOLID, true); // contents
    view.setUint32(4, 70000, true); // cluster
    view.setUint32(8, 200, true); // area
    for (let i = 0; i < 6; i++) view.setFloat32(12 + i * 4, 0, true);
    view.setUint32(36, 90000, true); // firstleafface
    view.setUint32(40, 5, true); // numleaffaces
    view.setUint32(44, 0, true);
    view.setUint32(48, 0, true);

    const din = readDleafExt(view, 0);
    expect(din.cluster).toBe(70000);
    expect(din.area).toBe(200);
    expect(din.firstleafface).toBe(90000);
    expect(din.numleaffaces).toBe(5);

    view.setUint32(4, 0xffffffff, true); // the null-cluster sentinel
    expect(readDleafExt(view, 0).cluster).toBe(-1);
  });

  test("readDnodeExt: planenum/firstface past the classic uint16 ceiling; children keep the -1-leafnum encoding", () => {
    const buf = new ArrayBuffer(DNODE_EXT_T_SIZE);
    const view = new DataView(buf);
    view.setInt32(0, 80000, true); // planenum
    view.setInt32(4, 5, true); // children[0]: a real node index
    view.setInt32(8, -2, true); // children[1]: -1-leafnum encoding, leaf 1
    for (let i = 0; i < 6; i++) view.setFloat32(12 + i * 4, 0, true);
    view.setUint32(36, 100000, true); // firstface
    view.setUint32(40, 3, true); // numfaces
    const din = readDnodeExt(view, 0);
    expect(din.planenum).toBe(80000);
    expect(din.children).toEqual([5, -2]);
    expect(din.firstface).toBe(100000);
    expect(din.numfaces).toBe(3);
  });
});

// ===========================================================================
// 3. negative validation test
// ===========================================================================

describe("Mod_LoadBrushModel: QBSP extended-format negative validation", () => {
  beforeEach(() => {
    SetRefImports(makeLightFakeRi());
    resetModels();
  });

  test("a Nodes record with an out-of-range planenum throws bsp.c's own \"Bad planenum\"", () => {
    const name = "maps/badplanenum.bsp";
    registerFile(name, buildBadPlanenumQbsp());
    expect(() => Mod_ForName(name, false)).toThrow("Bad planenum");
  });
});

// ===========================================================================
// 4. light classic-format regression check: confirms the unchanged classic
// branch of Mod_LoadBrushModel still works after the ident dispatch was
// added. Non-renderable (zero texinfo/faces) so it never reaches
// R_FindImage, matching test/ref_model.test.ts's own structural-only
// approach for the same reason.
// ===========================================================================

describe("Mod_LoadBrushModel: classic IBSP still loads after the QBSP branch was added (regression)", () => {
  beforeEach(() => {
    SetRefImports(makeLightFakeRi());
    resetModels();
  });

  test("a structural classic box room loads through the unchanged classic branch", () => {
    const name = "maps/classicroom.bsp";
    registerFile(name, buildBoxRoomBsp({ extended: false, renderable: false }));
    const mod = Mod_ForName(name, false);
    if (!mod) throw new Error("expected the classic room to load");
    expect(mod.numplanes).toBe(6);
    expect(mod.numnodes).toBe(6);
    expect(mod.numleafs).toBe(2);
    expect(mod.numsubmodels).toBe(1);
    expect(mod.leafs[0].contents).toBe(CONTENTS_SOLID);
    expect(mod.leafs[1].cluster).toBe(0);
  });
});

// ===========================================================================
// 2. end-to-end test: a renderable QBSP (extended) box room, loaded through
// the real Mod_ForName via R_BeginRegistration, using the same GetRefAPI/
// r_local harness style test/ref_frame.test.ts drives its own (classic-
// format) box room through -- see that file's beforeAll around line 150 for
// the pattern being mirrored here.
// ===========================================================================

describe("Mod_ForName loads a QBSP (extended) box room end-to-end via the real renderer pipeline", () => {
  const MODE_WIDTH = 320;
  const MODE_HEIGHT = 240;
  const cvars = new Map<string, CvarT>();

  function makeCvar(name: string, value: string, flags: number): CvarT {
    const existing = cvars.get(name);
    if (existing) return existing;
    const c = new CvarT();
    c.name = name;
    c.string = value;
    c.value = Number.parseFloat(value) || 0;
    c.flags = flags;
    c.modified = true;
    cvars.set(name, c);
    return c;
  }

  function fakeGapiRefImports(): RefImports {
    return {
      Sys_Error(_level: number, str: string): never {
        throw new Error(`Sys_Error: ${str}`);
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
      Cvar_Get: (name: string, value: string, flags: number) => makeCvar(name, value, flags),
      Cvar_Set: (name: string, value: string) => {
        const c = makeCvar(name, value, 0);
        c.string = value;
        c.value = Number.parseFloat(value) || 0;
        c.modified = true;
        return c;
      },
      Cvar_SetValue: (name: string, value: number) => {
        const c = makeCvar(name, String(value), 0);
        c.value = value;
        c.string = String(value);
        c.modified = true;
      },
      Vid_GetModeInfo: (mode: number) => (mode === 0 ? { width: MODE_WIDTH, height: MODE_HEIGHT } : null),
      Vid_MenuInit: () => undefined,
      Vid_NewWindow: () => undefined,
    };
  }

  let ref: RefExports;
  let loadError: unknown = null;

  beforeAll(() => {
    files.set("maps/qbsproom.bsp", buildBoxRoomBsp({ extended: true, renderable: true }));
    files.set("pics/colormap.pcx", buildColormapPcx());

    VID_Init();
    ref = GetRefAPI(fakeGapiRefImports());
    ref.Init(null, null);
    try {
      ref.BeginRegistration("qbsproom");
      ref.EndRegistration();
    } catch (e) {
      loadError = e;
    }
  });

  test("loads without error and produces the same surface/node/leaf counts a classic-format version of this room would", () => {
    expect(loadError).toBeNull();
    if (!r_worldmodel) throw new Error("expected r_worldmodel to be populated");
    expect(r_worldmodel.name).toBe("maps/qbsproom.bsp");
    // six wall faces from the builder, plus the six R_InitSkyBox appends --
    // the exact counts test/ref_frame.test.ts's classic-format box room
    // (identical geometry) asserts for its own r_worldmodel.
    expect(r_worldmodel.numsurfaces).toBe(12);
    expect(r_worldmodel.numnodes).toBe(6);
    expect(r_worldmodel.numleafs).toBe(2);
    expect(r_worldmodel.numplanes).toBe(6);
    expect(r_worldmodel.numvertexes).toBe(24 + 8); // + R_InitSkyBox's 8 synthetic verts
    expect(r_worldmodel.numedges).toBe(25 + 12); // + R_InitSkyBox's 12 synthetic edges
  });

  test("a wide-format wall surface decodes to the right plane/texinfo, with SURF_PLANEBACK unset (drawflags was 0)", () => {
    if (!r_worldmodel) throw new Error("expected r_worldmodel to be populated");
    const s = r_worldmodel.surfaces[0];
    expect(s.numedges).toBe(4);
    expect(s.plane).toBe(r_worldmodel.planes[0]);
    expect(s.texinfo).toBe(r_worldmodel.texinfo[1]);
    expect(s.flags & SURF_PLANEBACK).toBe(0);
  });

  test("the empty leaf's wide-format leafface span marks all six wall surfaces", () => {
    if (!r_worldmodel) throw new Error("expected r_worldmodel to be populated");
    const leaf = r_worldmodel.leafs[1];
    expect(leaf.nummarksurfaces).toBe(6);
    expect(leaf.firstmarksurface.length).toBeGreaterThanOrEqual(6);
    expect(leaf.firstmarksurface[0]).toBe(r_worldmodel.surfaces[0]);
  });
});
