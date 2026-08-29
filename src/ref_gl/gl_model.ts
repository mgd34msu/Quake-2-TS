/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/gl_model.h (types) and ref_gl/gl_model.c (Mod_Init,
Mod_ClearAll, Mod_ForName, Mod_PointInLeaf, Mod_ClusterPVS, Mod_Modellist_f,
Hunk_Begin/Alloc/End/Free, Mod_Free, Mod_FreeAll -- every function
gl_model.h declares -- plus R_BeginRegistration/R_RegisterModel/
R_EndRegistration, which gl_model.c defines but gl_local.h does not
separately declare) -- GNU GPL v2 or later. Every one of those functions
throws PendingPort until the real module lands, mirroring ref_soft/
r_model.ts's RS1-era stub shape exactly (that file's own header comment
explains the same convention for the software renderer's Mod_* family).

d*_t structures are on-disk representations (qfiles.ts/cmodel.ts already own
the BSP ones); m*_t structures here are the GL renderer's own in-memory
ones -- byte-for-byte the C mnode_t/mleaf_t/msurface_t/etc, distinct from
ref_soft/r_model.ts's identically-named classes (each renderer keeps its own
copy of these structs in the original C, right down to msurface_t growing
GL-only fields like light_s/light_t/dlight_s/dlight_t/lightmapchain that the
software renderer's msurface_t doesn't have).
*/

import { type Vec3, vec3 } from "../shared/math";
import { CplaneT } from "../shared/q_shared";
import type { DmodelT } from "../qcommon/qfiles";
import { PendingPort } from "../qcommon/pending";
import type { ImageT } from "./gl_local";

// mplane_t is byte-for-byte the same struct as q_shared.ts's CplaneT
// (cplane_t) -- see r_model.ts's identical MplaneT alias and comment.
export type MplaneT = CplaneT;

export const SIDE_FRONT = 0;
export const SIDE_BACK = 1;
export const SIDE_ON = 2;

export const SURF_PLANEBACK = 2;
export const SURF_DRAWSKY = 4;
export const SURF_DRAWTURB = 0x10;
export const SURF_DRAWBACKGROUND = 0x40;
export const SURF_UNDERWATER = 0x80;

// !!! if this is changed, it must be changed in asm_draw.h too !!! (C
// comment on mvertex_t/medge_t; the x86 asm path is dropped project-wide
// per PORTING.md, kept here only as the original context for the comment)
export class MvertexT {
  position: Vec3 = vec3();
}

export const MAXLIGHTMAPS = 4;

export class MedgeT {
  v: [number, number] = [0, 0];
  cachededgeoffset = 0;
}

export class MtexinfoT {
  vecs: [Float32Array, Float32Array] = [new Float32Array(4), new Float32Array(4)];
  flags = 0;
  numframes = 0;
  next: MtexinfoT | null = null; // animation chain
  image: ImageT | null = null;
}

export const VERTEXSIZE = 7;

// variable sized in C (`float verts[4][VERTEXSIZE]` is a flexible tail,
// `Hunk_Alloc`d to fit `numverts`); modeled as a growable array of
// VERTEXSIZE-length rows (xyz s1t1 s2t2) rather than a fixed C array.
export class GlpolyT {
  next: GlpolyT | null = null;
  chain: GlpolyT | null = null;
  numverts = 0;
  flags = 0; // for SURF_UNDERWATER (not needed anymore?)
  verts: Float32Array[] = [];
}

export class MsurfaceT {
  visframe = 0; // should be drawn when node is crossed

  plane: MplaneT | null = null;
  flags = 0;

  firstedge = 0; // look up in model->surfedges[], negative numbers
  numedges = 0; // are backwards edges

  texturemins: [number, number] = [0, 0];
  extents: [number, number] = [0, 0];

  light_s = 0;
  light_t = 0; // gl lightmap coordinates
  dlight_s = 0;
  dlight_t = 0; // gl lightmap coordinates for dynamic lightmaps

  polys: GlpolyT | null = null; // multiple if warped
  texturechain: MsurfaceT | null = null;
  lightmapchain: MsurfaceT | null = null;

  texinfo: MtexinfoT | null = null;

  // lighting info
  dlightframe = 0;
  dlightbits = 0;

  lightmaptexturenum = 0;
  styles: number[] = new Array<number>(MAXLIGHTMAPS).fill(0);
  cached_light: number[] = new Array<number>(MAXLIGHTMAPS).fill(0); // values currently used in lightmap
  samples: Uint8Array | null = null; // [numstyles*surfsize]
}

export const CONTENTS_NODE = -1;

// mnode_t/mleaf_t share a leading "common with leaf"/"common with node"
// field prefix in C so a node's `children[2]` can point at either;
// `contents !== CONTENTS_NODE` is the C idiom for telling them apart.
// Modeled as a discriminated union over that field, matching r_model.ts's
// identical MnodeOrLeaf/isMleaf pair.
export type MnodeOrLeaf = MnodeT | MleafT;

export function isMleaf(n: MnodeOrLeaf): n is MleafT {
  return n.contents !== CONTENTS_NODE;
}

export class MnodeT {
  // common with leaf
  contents: number = CONTENTS_NODE;
  visframe = 0;

  minmaxs: number[] = new Array<number>(6).fill(0); // for bounding box culling

  parent: MnodeT | null = null;

  // node specific
  plane: MplaneT | null = null;
  children: [MnodeOrLeaf | null, MnodeOrLeaf | null] = [null, null];

  firstsurface = 0;
  numsurfaces = 0;
}

export class MleafT {
  // common with node
  contents = 0; // will be a negative contents number
  visframe = 0;

  minmaxs: number[] = new Array<number>(6).fill(0);

  parent: MnodeT | null = null;

  // leaf specific
  cluster = 0;
  area = 0;

  firstmarksurface: MsurfaceT[] = []; // slice into model.marksurfaces starting here
  nummarksurfaces = 0;
}

//===================================================================

export const MAX_MD2SKINS = 32;

export enum ModtypeT {
  mod_bad,
  mod_brush,
  mod_sprite,
  mod_alias,
}

export class ModelT {
  name = ""; // MAX_QPATH

  registration_sequence = 0;

  type: ModtypeT = ModtypeT.mod_bad;
  numframes = 0;

  flags = 0;

  // volume occupied by the model graphics
  mins: Vec3 = vec3();
  maxs: Vec3 = vec3();
  radius = 0;

  // solid volume for clipping
  clipbox = false;
  clipmins: Vec3 = vec3();
  clipmaxs: Vec3 = vec3();

  // brush model
  firstmodelsurface = 0;
  nummodelsurfaces = 0;
  lightmap = 0; // only for submodels

  numsubmodels = 0;
  submodels: DmodelT[] = [];

  numplanes = 0;
  planes: MplaneT[] = [];

  numleafs = 0; // number of visible leafs, not counting 0
  leafs: MleafT[] = [];

  numvertexes = 0;
  vertexes: MvertexT[] = [];

  numedges = 0;
  edges: MedgeT[] = [];

  numnodes = 0;
  firstnode = 0;
  nodes: MnodeT[] = [];

  numtexinfo = 0;
  texinfo: MtexinfoT[] = [];

  numsurfaces = 0;
  surfaces: MsurfaceT[] = [];

  numsurfedges = 0;
  surfedges: number[] = [];

  nummarksurfaces = 0;
  marksurfaces: MsurfaceT[] = [];

  // dvis_t is aliased over the raw visibility lump, not parsed into a
  // struct -- see qfiles.ts's dvisNumClusters/dvisBitofs, which read
  // straight out of this buffer (mirrors r_model.ts's ModelT.vis).
  vis: Uint8Array | null = null;

  lightdata: Uint8Array | null = null;

  // for alias models and skins
  skins: (ImageT | null)[] = new Array<ImageT | null>(MAX_MD2SKINS).fill(null);

  extradatasize = 0;
  extradata: unknown = null; // opaque cache blob owned by the (unported) alias/sprite/brush loaders

  // mirrors `memset(mod, 0, sizeof(*mod))` (Mod_Free/R_EndRegistration) per
  // PORTING.md's clear()-for-memset convention.
  clear(): void {
    Object.assign(this, new ModelT());
  }
}

const MAX_MOD_KNOWN = 256;
export const mod_known: ModelT[] = Array.from({ length: MAX_MOD_KNOWN }, () => new ModelT());
export const mod_inline: ModelT[] = Array.from({ length: MAX_MOD_KNOWN }, () => new ModelT());

/*
============================================================================
*/

export function Mod_Init(): void {
  throw new PendingPort("Mod_Init");
}

export function Mod_ClearAll(): void {
  throw new PendingPort("Mod_ClearAll");
}

export function Mod_ForName(name: string, crash: boolean): ModelT | null {
  throw new PendingPort("Mod_ForName");
}

export function Mod_PointInLeaf(p: Vec3, model: ModelT): MleafT {
  throw new PendingPort("Mod_PointInLeaf");
}

export function Mod_ClusterPVS(cluster: number, model: ModelT): Uint8Array | null {
  throw new PendingPort("Mod_ClusterPVS");
}

export function Mod_Modellist_f(): void {
  throw new PendingPort("Mod_Modellist_f");
}

// gl_model.c's own small bump-allocator arena (distinct from qcommon's
// Z_Malloc/Hunk_* -- see PORTING.md's "plain allocation" idiom for
// Z_Malloc/Hunk_* generally); `loadmodel->extradata` is one of these per
// model, sized by Hunk_Begin and finalized by Hunk_End. Not the same
// allocator as src/platform's file loader.
export function Hunk_Begin(maxsize: number): unknown {
  throw new PendingPort("Hunk_Begin");
}

export function Hunk_Alloc(size: number): unknown {
  throw new PendingPort("Hunk_Alloc");
}

export function Hunk_End(): number {
  throw new PendingPort("Hunk_End");
}

export function Hunk_Free(base: unknown): void {
  throw new PendingPort("Hunk_Free");
}

export function Mod_Free(mod: ModelT): void {
  throw new PendingPort("Mod_Free");
}

export function Mod_FreeAll(): void {
  throw new PendingPort("Mod_FreeAll");
}

// Defined in gl_model.c (not separately declared in gl_local.h -- these are
// the refexport_t-facing entry points gl_rmain.c's GetRefAPI-equivalent
// wires up, exactly like r_model.ts's identically-named exports for the
// software renderer).
export function R_BeginRegistration(model: string): void {
  throw new PendingPort("R_BeginRegistration");
}

export function R_RegisterModel(name: string): ModelT | null {
  throw new PendingPort("R_RegisterModel");
}

export function R_EndRegistration(): void {
  throw new PendingPort("R_EndRegistration");
}
