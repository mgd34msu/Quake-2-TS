/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from qcommon/qfiles.h (GNU GPL v2 or later).

qfiles.h: quake file formats

Only the .BSP format structures are ported here (the ones cmodel.c reads).
The .pak (dpackfile_t/dpackheader_t), .pcx (pcx_t), .MD2 (dstvert_t/
dtriangle_t/dtrivertx_t/daliasframe_t/dmdl_t), .SP2 (dsprframe_t/dsprite_t),
and .WAL (miptex_t) formats are not read by cmodel.c and are not trivial
filler (they are real formats with real callers) -- they are deferred to the
future model/image-loading units (src/qcommon/files.ts's PAK reader,
src/client or src/ref_* WAL/MD2/SP2 loaders). Reported per brief.

CONTENTS_ and SURF_ constants are deliberately not redefined here: qfiles.h
duplicates q_shared.h's copy verbatim ("these definitions also need to be in
q_shared.h!"), and src/shared/q_shared.ts already exports them from that
side of the duplication.

Binary structures are parsed from a DataView with explicit little-endian
reads, struct-by-struct, at the same byte offsets as the C layout (see
PORTING.md: "Binary file formats ... parsed from ArrayBuffer with DataView").
Parsed structs are returned as plain interfaces (read-only parse results,
never mutated in place the way the mutable cmodel.ts runtime structures are),
which is why they are typed as `interface` rather than the `class` used for
q_shared.ts's stateful structs.
*/

// upper design bounds
//
// classic (IBSP) design bounds, ported verbatim from quake-2-c/qcommon/qfiles.h.
// Retail's "Call of the Machine" (rerelease) maps ship in the QBSP extended
// format (see IDBSPHEADER_EXT below) with 32-bit lump records specifically so
// these classic 16-bit-index-derived counts can be blown through -- worst
// case across maps/mgu*.bsp: planes 712300, faces 102064, leafs 94777,
// brushsides 234232, leaffaces 223570, leafbrushes 141772, edges 306562,
// surfedges 307373, verts 238614, nodes 80015, brushes 13301, lighting
// 11.3MB, vis 2.9MB. q2repro's src/common/bsp.c (BSP_Load, bsp_lumps[])
// enforces none of these as rejection caps: it derives allocation size
// straight from each lump's on-disk byte length and instead validates
// *cross-references* (e.g. "a brush's firstside+numsides must not exceed
// numbrushsides", "a leaf's cluster must be < numclusters") -- there is no
// upper bound on the count itself. The consumers in this repo (cmodel.ts,
// gl_model.ts, r_model.ts) now follow that model: they no longer reject a
// load merely for exceeding these classic constants (removed from every
// count check they used to gate), replacing the count-cap with the same
// cross-reference bounds-check bsp.c performs at each corresponding site
// (grep each consumer for "Bad " error strings mirroring bsp.c's BSP_ENSURE
// messages). These MAX_MAP_* constants are kept only where something still
// legitimately needs a size number: fixed-format struct sizing
// (MAX_MAP_ENTSTRING/LIGHTING/VISIBILITY below are no longer used as
// rejection caps either, but MAX_MAP_AREAS remains a real engine limit, see
// its own comment) or documentation of the classic wire format's own historic
// ceiling. This is the same "keep the wire-format constant, drop the
// engine-arbitrary one" split files.ts's MAX_FILES_IN_PACK already
// demonstrates (files.ts:91, checked at files.ts:563 against the .pak
// directory's own byte-derived file count -- a real format constant, not an
// invented cap) -- applied here to the BSP loader.
//
// leaffaces, leafbrushes, planes, and verts are still bounded by
// 16 bit short limits (classic format only)
export const MAX_MAP_MODELS = 1024; // superseded by MAX_MODELS - 2 below (q2repro's real submodel cap); kept only as documentation of the classic constant, no longer imported by any loader
export const MAX_MAP_BRUSHES = 8192; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_ENTITIES = 2048;
export const MAX_MAP_ENTSTRING = 0x40000; // no longer enforced as a load-rejection cap (retail entstring: 176770 bytes, already under this, but bsp.c has no cap at all)
export const MAX_MAP_TEXINFO = 8192; // no longer enforced as a load-rejection cap; retail texinfo count reaches 36404

export const MAX_MAP_AREAS = 256; // real engine/network-protocol limit (area index travels in wire-sized fields elsewhere) -- q2repro's BSP_LoadAreas keeps this exact cap (BSP_ENSURE(count <= MAX_MAP_AREAS)); still enforced by every consumer
export const MAX_MAP_AREAPORTALS = 1024;
export const MAX_MAP_PLANES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_NODES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_BRUSHSIDES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_LEAFS = 65536; // no longer enforced as a load-rejection cap, see file header comment; still used to size cluster-indexed vis-row scratch buffers (numerically == MAX_MAP_CLUSTERS, see below)
export const MAX_MAP_VERTS = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_FACES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_LEAFFACES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_LEAFBRUSHES = 65536; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_PORTALS = 65536;
export const MAX_MAP_EDGES = 128000; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_SURFEDGES = 256000; // no longer enforced as a load-rejection cap, see file header comment
export const MAX_MAP_LIGHTING = 0x200000; // no longer enforced as a load-rejection cap (retail lighting: up to 11.3MB, far over this)
export const MAX_MAP_VISIBILITY = 0x100000; // no longer enforced as a load-rejection cap (retail vis: up to 2.9MB, over this); map_visibility in cmodel.ts is sized dynamically per-load instead of preallocated to this constant

// q2repro's real cross-format caps (src/common/bsp.c / inc/format/bsp.h,
// inc/shared/shared.h), used by the dynamic validation model above in place
// of the removed MAX_MAP_* rejection caps.
export const MAX_MAP_CLUSTERS = 65536; // BSP_LoadVisibility: BSP_ENSURE(numclusters <= MAX_MAP_CLUSTERS)
export const MAX_MODELS = 8192; // shared.h: "half is reserved for inline BSP models"; BSP_LoadSubModels: BSP_ENSURE(count <= MAX_MODELS - 2)

// key / value pair sizes
export const MAX_KEY = 32;
export const MAX_VALUE = 1024;

//=============================================================================

export interface LumpT {
  fileofs: number;
  filelen: number;
}
export const LUMP_T_SIZE = 8;

export const LUMP_ENTITIES = 0;
export const LUMP_PLANES = 1;
export const LUMP_VERTEXES = 2;
export const LUMP_VISIBILITY = 3;
export const LUMP_NODES = 4;
export const LUMP_TEXINFO = 5;
export const LUMP_FACES = 6;
export const LUMP_LIGHTING = 7;
export const LUMP_LEAFS = 8;
export const LUMP_LEAFFACES = 9;
export const LUMP_LEAFBRUSHES = 10;
export const LUMP_EDGES = 11;
export const LUMP_SURFEDGES = 12;
export const LUMP_MODELS = 13;
export const LUMP_BRUSHES = 14;
export const LUMP_BRUSHSIDES = 15;
export const LUMP_POP = 16;
export const LUMP_AREAS = 17;
export const LUMP_AREAPORTALS = 18;
export const HEADER_LUMPS = 19;

export interface DheaderT {
  ident: number;
  version: number;
  lumps: LumpT[];
}
export const DHEADER_T_SIZE = 4 + 4 + HEADER_LUMPS * LUMP_T_SIZE;

// little-endian "IBSP"
export const IDBSPHEADER = ("P".charCodeAt(0) << 24) + ("S".charCodeAt(0) << 16) + ("B".charCodeAt(0) << 8) + "I".charCodeAt(0);

// little-endian "QBSP" -- q2repro's extended-format ident (inc/format/bsp.h:
// IDBSPHEADER_EXT). Same BSPVERSION (38) as classic IBSP; only the on-disk
// record width of the E()-tagged lumps below changes. Ported from Call of
// the Machine's maps/mgu*.bsp, which ship in this format because their
// texinfo/plane/face/etc. counts exceed what IBSP's 16-bit indices can
// address.
export const IDBSPHEADER_EXT = ("P".charCodeAt(0) << 24) + ("S".charCodeAt(0) << 16) + ("B".charCodeAt(0) << 8) + "Q".charCodeAt(0);

export const BSPVERSION = 38;

export interface DmodelT {
  mins: [number, number, number];
  maxs: [number, number, number];
  origin: [number, number, number]; // for sounds or lights
  headnode: number;
  firstface: number;
  numfaces: number; // submodels just draw faces without walking the bsp tree
}
export const DMODEL_T_SIZE = 48;

export interface DvertexT {
  point: [number, number, number];
}
export const DVERTEX_T_SIZE = 12;

// 0-2 are axial planes
export const PLANE_X = 0;
export const PLANE_Y = 1;
export const PLANE_Z = 2;

// 3-5 are non-axial planes snapped to the nearest
export const PLANE_ANYX = 3;
export const PLANE_ANYY = 4;
export const PLANE_ANYZ = 5;

// planes (x&~1) and (x&~1)+1 are always opposites

export interface DplaneT {
  normal: [number, number, number];
  dist: number;
  type: number; // PLANE_X - PLANE_ANYZ ?remove? trivial to regenerate
}
export const DPLANE_T_SIZE = 20;

export interface DnodeT {
  planenum: number;
  children: [number, number]; // negative numbers are -(leafs+1), not nodes
  mins: [number, number, number]; // for frustom culling
  maxs: [number, number, number];
  firstface: number;
  numfaces: number; // counting both sides
}
export const DNODE_T_SIZE = 28;

export interface TexinfoT {
  vecs: [[number, number, number, number], [number, number, number, number]]; // [s/t][xyz offset]
  flags: number; // miptex flags + overrides
  value: number; // light emission, etc
  texture: string; // texture name (textures/*.wal)
  nexttexinfo: number; // for animations, -1 = end of chain
}
export const TEXINFO_T_SIZE = 76;

// note that edge 0 is never used, because negative edge nums are used for
// counterclockwise use of the edge in a face
export interface DedgeT {
  v: [number, number]; // vertex numbers
}
export const DEDGE_T_SIZE = 4;

export const MAXLIGHTMAPS = 4;
export interface DfaceT {
  planenum: number;
  side: number;
  firstedge: number; // we must support > 64k edges
  numedges: number;
  texinfo: number;
  styles: [number, number, number, number]; // lighting info
  lightofs: number; // start of [numstyles*surfsize] samples
}
export const DFACE_T_SIZE = 20;

export interface DleafT {
  contents: number; // OR of all brushes (not needed?)
  cluster: number;
  area: number;
  mins: [number, number, number]; // for frustum culling
  maxs: [number, number, number];
  firstleafface: number;
  numleaffaces: number;
  firstleafbrush: number;
  numleafbrushes: number;
}
export const DLEAF_T_SIZE = 28;

export interface DbrushsideT {
  planenum: number; // facing out of the leaf
  texinfo: number;
}
export const DBRUSHSIDE_T_SIZE = 4;

export interface DbrushT {
  firstside: number;
  numsides: number;
  contents: number;
}
export const DBRUSH_T_SIZE = 12;

export const ANGLE_UP = -1;
export const ANGLE_DOWN = -2;

// the visibility lump consists of a header with a count, then
// byte offsets for the PVS and PHS of each cluster, then the raw
// compressed bit vectors
export const DVIS_PVS = 0;
export const DVIS_PHS = 1;

// dvis_t is not parsed into a plain object the way the other structs are:
// in the C original it is a `dvis_t *` cast directly over the raw
// map_visibility buffer (the trailing `bitofs[8][2]` is only a declared
// capacity, not the real one -- the real length is `numclusters`, read from
// the buffer itself). This port keeps that same aliasing: read the header
// fields directly out of a DataView over the live map_visibility buffer.
export function dvisNumClusters(view: DataView): number {
  return view.getInt32(0, true);
}

export function dvisBitofs(view: DataView, cluster: number, which: number): number {
  return view.getInt32(4 + (cluster * 2 + which) * 4, true);
}

// each area has a list of portals that lead into other areas
// when portals are closed, other areas may not be visible or
// hearable even if the vis info says that it should be
export interface DareaportalT {
  portalnum: number;
  otherarea: number;
}
export const DAREAPORTAL_T_SIZE = 8;

export interface DareaT {
  numareaportals: number;
  firstareaportal: number;
}
export const DAREA_T_SIZE = 8;

//=============================================================================
// parse helpers

// reads up to maxLen bytes starting at offset, stopping at the first NUL --
// mirrors treating a fixed C char[] field as a NUL-terminated string.
function readCString(view: DataView, offset: number, maxLen: number): string {
  let s = "";
  for (let i = 0; i < maxLen; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export function readLump(view: DataView, offset: number): LumpT {
  return {
    fileofs: view.getInt32(offset, true),
    filelen: view.getInt32(offset + 4, true),
  };
}

export function readDheader(view: DataView, offset: number): DheaderT {
  const ident = view.getInt32(offset, true);
  const version = view.getInt32(offset + 4, true);
  const lumps: LumpT[] = [];
  for (let i = 0; i < HEADER_LUMPS; i++) {
    lumps.push(readLump(view, offset + 8 + i * LUMP_T_SIZE));
  }
  return { ident, version, lumps };
}

export function readDmodel(view: DataView, offset: number): DmodelT {
  return {
    mins: [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)],
    maxs: [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)],
    origin: [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true), view.getFloat32(offset + 32, true)],
    headnode: view.getInt32(offset + 36, true),
    firstface: view.getInt32(offset + 40, true),
    numfaces: view.getInt32(offset + 44, true),
  };
}

export function readDplane(view: DataView, offset: number): DplaneT {
  return {
    normal: [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)],
    dist: view.getFloat32(offset + 12, true),
    type: view.getInt32(offset + 16, true),
  };
}

export function readDnode(view: DataView, offset: number): DnodeT {
  return {
    planenum: view.getInt32(offset, true),
    children: [view.getInt32(offset + 4, true), view.getInt32(offset + 8, true)],
    mins: [view.getInt16(offset + 12, true), view.getInt16(offset + 14, true), view.getInt16(offset + 16, true)],
    maxs: [view.getInt16(offset + 18, true), view.getInt16(offset + 20, true), view.getInt16(offset + 22, true)],
    firstface: view.getUint16(offset + 24, true),
    numfaces: view.getUint16(offset + 26, true),
  };
}

export function readTexinfo(view: DataView, offset: number): TexinfoT {
  return {
    vecs: [
      [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true), view.getFloat32(offset + 12, true)],
      [view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true), view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true)],
    ],
    flags: view.getInt32(offset + 32, true),
    value: view.getInt32(offset + 36, true),
    texture: readCString(view, offset + 40, 32),
    nexttexinfo: view.getInt32(offset + 72, true),
  };
}

export function readDleaf(view: DataView, offset: number): DleafT {
  return {
    contents: view.getInt32(offset, true),
    cluster: view.getInt16(offset + 4, true),
    area: view.getInt16(offset + 6, true),
    mins: [view.getInt16(offset + 8, true), view.getInt16(offset + 10, true), view.getInt16(offset + 12, true)],
    maxs: [view.getInt16(offset + 14, true), view.getInt16(offset + 16, true), view.getInt16(offset + 18, true)],
    firstleafface: view.getUint16(offset + 20, true),
    numleaffaces: view.getUint16(offset + 22, true),
    firstleafbrush: view.getUint16(offset + 24, true),
    numleafbrushes: view.getUint16(offset + 26, true),
  };
}

export function readDbrushside(view: DataView, offset: number): DbrushsideT {
  return {
    planenum: view.getUint16(offset, true),
    texinfo: view.getInt16(offset + 2, true),
  };
}

export function readDbrush(view: DataView, offset: number): DbrushT {
  return {
    firstside: view.getInt32(offset, true),
    numsides: view.getInt32(offset + 4, true),
    contents: view.getInt32(offset + 8, true),
  };
}

export function readDareaportal(view: DataView, offset: number): DareaportalT {
  return {
    portalnum: view.getInt32(offset, true),
    otherarea: view.getInt32(offset + 4, true),
  };
}

export function readDarea(view: DataView, offset: number): DareaT {
  return {
    numareaportals: view.getInt32(offset, true),
    firstareaportal: view.getInt32(offset + 4, true),
  };
}

// LUMP_LEAFBRUSHES/LUMP_LEAFFACES have no named struct in qfiles.h -- they are
// raw `unsigned short` arrays.
export function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

//=============================================================================
// QBSP extended-format ("Ext") struct readers.
//
// Ported field-by-field from q2repro's src/common/bsp_template.c, which is
// compiled twice (once with BSP_EXTENDED=0, once with BSP_EXTENDED=1) to
// produce a BSP_Load<Name> / BSP_Load<Name>Ext pair per lump. Only the
// E()-tagged lumps in bsp.c's bsp_lumps[] table get a second, wider record
// layout here -- every L()-tagged lump (Texinfo, Planes, Brushes,
// AreaPortals, Areas, Vertices, SurfEdges, Lightmap, SubModels, EntString,
// Visibility) is byte-identical between formats and reuses the existing
// classic reader unchanged.
//
// Disk sizes (classic -> extended), from bsp_lumps[]'s E() rows:
//   BrushSides   4 -> 8    LeafBrushes  2 -> 4
//   Edges        4 -> 8    Faces       20 -> 28
//   LeafFaces    2 -> 4    Leafs       28 -> 52
//   Nodes       28 -> 44
//
// Sentinel convention: BSP_ExtNull is (uint16_t)-1 in the classic reader and
// (uint32_t)-1 in the extended reader -- both are "all bits set" for their
// field width, so a null texinfo/cluster reads back as -1 either way. These
// Ext readers normalize that sentinel to -1 up front (same convention the
// existing classic readDbrushside/readDleaf callers already rely on via
// their signed getInt16 reads), so downstream code can treat classic and
// extended results identically.

export const DBRUSHSIDE_EXT_T_SIZE = 8;
export interface DbrushsideExtT {
  planenum: number;
  texinfo: number; // -1 if the on-disk lump stored the null-texinfo sentinel
}
export function readDbrushsideExt(view: DataView, offset: number): DbrushsideExtT {
  const texinfoRaw = view.getUint32(offset + 4, true);
  return {
    planenum: view.getUint32(offset, true),
    texinfo: texinfoRaw === 0xffffffff ? -1 : texinfoRaw,
  };
}

// LeafBrushes/LeafFaces have no named struct in bsp.h either in extended
// form -- raw uint32 arrays, index validated by the caller against
// numbrushes/numfaces (bsp.c: "Bad brushnum"/"Bad facenum"). No sentinel.
export const LEAFBRUSH_EXT_SIZE = 4;
export const LEAFFACE_EXT_SIZE = 4;
export function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export const DLEAF_EXT_T_SIZE = 52;
export interface DleafExtT {
  contents: number;
  cluster: number; // -1 sentinel already normalized (see file header comment)
  area: number;
  mins: [number, number, number];
  maxs: [number, number, number];
  firstleafface: number;
  numleaffaces: number;
  firstleafbrush: number;
  numleafbrushes: number;
}
export function readDleafExt(view: DataView, offset: number): DleafExtT {
  const clusterRaw = view.getUint32(offset + 4, true);
  return {
    contents: view.getInt32(offset, true),
    cluster: clusterRaw === 0xffffffff ? -1 : clusterRaw,
    area: view.getUint32(offset + 8, true),
    mins: [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)],
    maxs: [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true), view.getFloat32(offset + 32, true)],
    firstleafface: view.getUint32(offset + 36, true),
    numleaffaces: view.getUint32(offset + 40, true),
    firstleafbrush: view.getUint32(offset + 44, true),
    numleafbrushes: view.getUint32(offset + 48, true),
  };
}

export const DNODE_EXT_T_SIZE = 44;
export interface DnodeExtT {
  planenum: number;
  children: [number, number];
  mins: [number, number, number];
  maxs: [number, number, number];
  firstface: number;
  numfaces: number;
}
export function readDnodeExt(view: DataView, offset: number): DnodeExtT {
  return {
    planenum: view.getInt32(offset, true),
    children: [view.getInt32(offset + 4, true), view.getInt32(offset + 8, true)],
    mins: [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)],
    maxs: [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true), view.getFloat32(offset + 32, true)],
    firstface: view.getUint32(offset + 36, true),
    numfaces: view.getUint32(offset + 40, true),
  };
}

export const DEDGE_EXT_T_SIZE = 8;
export interface DedgeExtT {
  v: [number, number];
}
export function readDedgeExt(view: DataView, offset: number): DedgeExtT {
  return { v: [view.getUint32(offset, true), view.getUint32(offset + 4, true)] };
}

// bsp.h: "#define DSURF_PLANEBACK 1" -- the only bit of mface_t.drawflags
// the loader itself cares about (bsp_template.c: `out->drawflags =
// BSP_ExtLong() & DSURF_PLANEBACK`); matches the classic reader's `side`
// boolean field one-for-one (a nonzero classic `side` and a set
// DSURF_PLANEBACK bit both mean "plane back").
export const DSURF_PLANEBACK = 1;

export const DFACE_EXT_T_SIZE = 28;
export interface DfaceExtT {
  planenum: number;
  drawflags: number; // pre-masked to DSURF_PLANEBACK, see comment above
  firstedge: number;
  numedges: number;
  texinfo: number;
  styles: [number, number, number, number];
  lightofs: number;
}
export function readDfaceExt(view: DataView, offset: number): DfaceExtT {
  return {
    planenum: view.getUint32(offset, true),
    drawflags: view.getUint32(offset + 4, true) & DSURF_PLANEBACK,
    firstedge: view.getInt32(offset + 8, true),
    numedges: view.getUint32(offset + 12, true),
    texinfo: view.getUint32(offset + 16, true),
    styles: [view.getUint8(offset + 20), view.getUint8(offset + 21), view.getUint8(offset + 22), view.getUint8(offset + 23)],
    lightofs: view.getInt32(offset + 24, true),
  };
}
