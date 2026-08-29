/*
Test support module, not a port of any .c file.

Builds a minimal-but-structurally-valid IBSP version 38 buffer (the format
read by src/qcommon/cmodel.ts's CM_LoadMap) so integration tests can exercise
real map loading without any copyrighted id Software map data. Byte offsets
and struct sizes are taken from src/qcommon/qfiles.ts (itself ported from
quake-2-c/qcommon/qfiles.h).

The generated map is a hollow, axis-aligned cube room: empty space for
|x|,|y|,|z| < ROOM_HALF, solid everywhere outside that. The BSP tree is a
simple 6-node chain, one node per wall plane: at each node, the "still
inside relative to this wall" branch continues to the next node, and the
"outside this wall" branch goes straight to the solid leaf. The last node's
"inside" branch reaches the empty leaf. Each wall also gets its own
single-sided brush (attached to the solid leaf) so CM_ClipBoxToBrush has
real geometry to clip traces against and report a plane normal from.
*/

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
  BSPVERSION,
  DHEADER_T_SIZE,
  DMODEL_T_SIZE,
  DPLANE_T_SIZE,
  DNODE_T_SIZE,
  TEXINFO_T_SIZE,
  DLEAF_T_SIZE,
  DBRUSHSIDE_T_SIZE,
  DBRUSH_T_SIZE,
  DAREA_T_SIZE,
  DAREAPORTAL_T_SIZE,
} from "../../src/qcommon/qfiles";
import { CONTENTS_SOLID } from "../../src/shared/q_shared";

// half-extent of the empty interior; solid begins at |axis| >= ROOM_HALF
export const ROOM_HALF = 64;

interface WallPlane {
  normal: [number, number, number];
  dist: number;
  type: number;
}

// six wall planes, one per axis direction. Positive-facing walls (+X/+Y/+Z)
// use an inward-pointing (negative) normal with type 3+axis; negative-facing
// walls use an outward-pointing (positive) normal with type axis -- matching
// the type<3-means-axis-aligned-positive-normal convention CM_InitBoxHull
// uses for its own synthetic box planes in cmodel.ts. `d = dot(normal,p) -
// dist` is negative on the solid side of each plane and non-negative on the
// empty side.
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

const SOLID_LEAF = 0;
const EMPTY_LEAF = 1;

function buildLump(count: number, itemSize: number, write: (view: DataView, base: number, i: number) => void): Uint8Array {
  const buf = new Uint8Array(count * itemSize);
  const view = new DataView(buf.buffer);
  for (let i = 0; i < count; i++) write(view, i * itemSize, i);
  return buf;
}

function stringBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function writeFixedString(view: DataView, base: number, s: string, maxLen: number): void {
  for (let i = 0; i < maxLen; i++) {
    view.setUint8(base + i, i < s.length ? s.charCodeAt(i) : 0);
  }
}

/*
Builds the full IBSP buffer. Lump order in the file is arbitrary (only the
header's fileofs/filelen matter); lumps CM_LoadMap never reads (VERTEXES,
FACES, LIGHTING, LEAFFACES, EDGES, SURFEDGES, POP) are emitted empty.
*/
export function buildBoxRoomBsp(): Uint8Array {
  const planes = wallPlanes();

  // ---- PLANES (6) ----
  const planesLump = buildLump(planes.length, DPLANE_T_SIZE, (view, base, i) => {
    const p = planes[i];
    view.setFloat32(base, p.normal[0], true);
    view.setFloat32(base + 4, p.normal[1], true);
    view.setFloat32(base + 8, p.normal[2], true);
    view.setFloat32(base + 12, p.dist, true);
    view.setInt32(base + 16, p.type, true);
  });

  // ---- NODES (6), chained: node i's "inside so far" child continues to
  // node i+1 (or the empty leaf on the last node); its "outside this wall"
  // child goes straight to the solid leaf. ----
  const nodeCount = 6;
  const nodesLump = buildLump(nodeCount, DNODE_T_SIZE, (view, base, i) => {
    const insideChild = i === nodeCount - 1 ? -1 - EMPTY_LEAF : i + 1;
    const outsideChild = -1 - SOLID_LEAF;
    view.setInt32(base, i, true); // planenum
    view.setInt32(base + 4, insideChild, true); // children[0]
    view.setInt32(base + 8, outsideChild, true); // children[1]
    view.setInt16(base + 12, 0, true); // mins (unused by cmodel.ts)
    view.setInt16(base + 14, 0, true);
    view.setInt16(base + 16, 0, true);
    view.setInt16(base + 18, 0, true); // maxs
    view.setInt16(base + 20, 0, true);
    view.setInt16(base + 22, 0, true);
    view.setUint16(base + 24, 0, true); // firstface (unused)
    view.setUint16(base + 26, 0, true); // numfaces (unused)
  });

  // ---- TEXINFO (1 dummy entry; brushsides need a valid texinfo index) ----
  const texinfoLump = buildLump(1, TEXINFO_T_SIZE, (view, base) => {
    view.setFloat32(base, 1, true);
    view.setFloat32(base + 4, 0, true);
    view.setFloat32(base + 8, 0, true);
    view.setFloat32(base + 12, 0, true);
    view.setFloat32(base + 16, 0, true);
    view.setFloat32(base + 20, 1, true);
    view.setFloat32(base + 24, 0, true);
    view.setFloat32(base + 28, 0, true);
    view.setInt32(base + 32, 0, true); // flags
    view.setInt32(base + 36, 0, true); // value
    writeFixedString(view, base + 40, "wall", 32); // texture
    view.setInt32(base + 72, -1, true); // nexttexinfo
  });

  // ---- LEAFS (2): leaf 0 solid (owns leafbrushes [0..5]), leaf 1 empty
  // (owns none -- its firstleafbrush is never indexed since numleafbrushes
  // is 0). ----
  const leafsLump = buildLump(2, DLEAF_T_SIZE, (view, base, i) => {
    const solid = i === SOLID_LEAF;
    view.setInt32(base, solid ? CONTENTS_SOLID : 0, true); // contents
    view.setInt16(base + 4, solid ? -1 : 0, true); // cluster
    view.setInt16(base + 6, solid ? 0 : 1, true); // area
    view.setInt16(base + 8, 0, true); // mins (unused)
    view.setInt16(base + 10, 0, true);
    view.setInt16(base + 12, 0, true);
    view.setInt16(base + 14, 0, true); // maxs
    view.setInt16(base + 16, 0, true);
    view.setInt16(base + 18, 0, true);
    view.setUint16(base + 20, 0, true); // firstleafface (unused)
    view.setUint16(base + 22, 0, true); // numleaffaces (unused)
    view.setUint16(base + 24, 0, true); // firstleafbrush
    view.setUint16(base + 26, solid ? 6 : 0, true); // numleafbrushes
  });

  // ---- LEAFBRUSHES (6): brush indices 0..5, all owned by the solid leaf ----
  const leafbrushesLump = buildLump(6, 2, (view, base, i) => {
    view.setUint16(base, i, true);
  });

  // ---- BRUSHES (6): one per wall, single-sided, CONTENTS_SOLID ----
  const brushesLump = buildLump(6, DBRUSH_T_SIZE, (view, base, i) => {
    view.setInt32(base, i, true); // firstside
    view.setInt32(base + 4, 1, true); // numsides
    view.setInt32(base + 8, CONTENTS_SOLID, true); // contents
  });

  // ---- BRUSHSIDES (6): brush i's single side references plane i ----
  const brushsidesLump = buildLump(6, DBRUSHSIDE_T_SIZE, (view, base, i) => {
    view.setUint16(base, i, true); // planenum
    view.setInt16(base + 2, 0, true); // texinfo
  });

  // ---- MODELS (1): the whole room, rooted at node 0 ----
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

  // ---- AREAS (1), AREAPORTALS (0) ----
  const areasLump = buildLump(1, DAREA_T_SIZE, (view, base) => {
    view.setInt32(base, 0, true); // numareaportals
    view.setInt32(base + 4, 0, true); // firstareaportal
  });
  const areaportalsLump = new Uint8Array(0);

  // ---- ENTITIES: one worldspawn entity ----
  const entitiesLump = stringBytes('{\n"classname" "worldspawn"\n}\n');

  // ---- unused-by-cmodel lumps, all empty ----
  const empty = new Uint8Array(0);

  const lumpOrder: Array<{ index: number; data: Uint8Array }> = [
    { index: LUMP_ENTITIES, data: entitiesLump },
    { index: LUMP_PLANES, data: planesLump },
    { index: LUMP_VERTEXES, data: empty },
    { index: LUMP_VISIBILITY, data: empty },
    { index: LUMP_NODES, data: nodesLump },
    { index: LUMP_TEXINFO, data: texinfoLump },
    { index: LUMP_FACES, data: empty },
    { index: LUMP_LIGHTING, data: empty },
    { index: LUMP_LEAFS, data: leafsLump },
    { index: LUMP_LEAFFACES, data: empty },
    { index: LUMP_LEAFBRUSHES, data: leafbrushesLump },
    { index: LUMP_EDGES, data: empty },
    { index: LUMP_SURFEDGES, data: empty },
    { index: LUMP_MODELS, data: modelsLump },
    { index: LUMP_BRUSHES, data: brushesLump },
    { index: LUMP_BRUSHSIDES, data: brushsidesLump },
    { index: LUMP_POP, data: empty },
    { index: LUMP_AREAS, data: areasLump },
    { index: LUMP_AREAPORTALS, data: areaportalsLump },
  ];

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

  // header
  outView.setInt32(0, IDBSPHEADER, true);
  outView.setInt32(4, BSPVERSION, true);
  for (let i = 0; i < HEADER_LUMPS; i++) {
    const info = lumpInfo[i];
    outView.setInt32(8 + i * 8, info.fileofs, true);
    outView.setInt32(8 + i * 8 + 4, info.filelen, true);
  }

  return out;
}
