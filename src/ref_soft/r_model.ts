/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_model.h (types) and ref_soft/r_model.c (the Mod_
family plus R_BeginRegistration/R_RegisterModel/R_EndRegistration, stubbed)
-- GNU GPL v2 or later.

d*_t structures are on-disk representations (qfiles.ts/cmodel.ts already own
the BSP ones); m*_t structures here are the software renderer's in-memory
ones.

Deviation from the C source layout: `image_t` is declared in r_local.h in
the original (right before `#include "r_model.h"`), not in r_model.h. The
brief for this unit places it here instead, alongside model_t/msurface_t/
mnode_t/mleaf_t/medge_t/mtexinfo_t. Per PORTING.md ("the brief's placement
wins; report the mismatch, don't move it") it stays here; r_local.ts imports
it from this module.
*/

import { type Vec3, vec3 } from "../shared/math";
import type { CplaneT } from "../shared/q_shared";
import type { DmodelT } from "../qcommon/qfiles";
import { PendingPort } from "../qcommon/pending";
import type { SurfcacheT } from "./r_local";

// mplane_t is byte-for-byte the same struct as q_shared.ts's CplaneT
// (cplane_t): vec3_t normal; float dist; byte type; byte signbits.
// (C's trailing byte pad[2] is dropped the same way CplaneT already drops
// it -- see that class's comment -- it exists only for the unported x86 asm
// BoxOnPlaneSide.) Reused directly rather than duplicated.
export type MplaneT = CplaneT;

export const SIDE_FRONT = 0;
export const SIDE_BACK = 1;
export const SIDE_ON = 2;

// FIXME: differentiate from texinfo SURF_ flags
export const SURF_PLANEBACK = 2;
export const SURF_DRAWSKY = 4; // sky brush face
export const SURF_DRAWTURB = 0x10;
export const SURF_DRAWBACKGROUND = 0x40;
export const SURF_DRAWSKYBOX = 0x80; // sky box
export const SURF_FLOW = 0x100; // PGM

// qfiles.h constants r_model.h depends on that qfiles.ts has not ported yet
// (that module's own report defers MD2/SP2/WAL formats to a future unit;
// r_model.c's brush/alias/sprite loading is itself pending, so these are
// declared locally rather than blocked on that future unit).
export const MIPLEVELS = 4;
export const MAX_MD2SKINS = 32;

//
// in memory representation
//
export class MvertexT {
  position: Vec3 = vec3();
}

export enum ImagetypeT {
  it_skin,
  it_sprite,
  it_wall,
  it_pic,
  it_sky,
}

// skins will be outline flood filled and mip mapped
// pics and sprites with alpha will be outline flood filled
// pic won't be mip mapped
export class ImageT {
  name = ""; // game path, including extension
  type: ImagetypeT = ImagetypeT.it_skin;
  width = 0;
  height = 0;
  transparent = false; // true if any 255 pixels in image
  registration_sequence = 0; // 0 = free
  pixels: (Uint8Array | null)[] = [null, null, null, null]; // mip levels
}

export class MedgeT {
  v: [number, number] = [0, 0];
  cachededgeoffset = 0;
}

export class MtexinfoT {
  vecs: [Float32Array, Float32Array] = [new Float32Array(4), new Float32Array(4)];
  mipadjust = 0;
  image: ImageT | null = null;
  flags = 0;
  numframes = 0;
  next: MtexinfoT | null = null; // animation chain
}

export class MsurfaceT {
  visframe = 0; // should be drawn when node is crossed

  dlightframe = 0;
  dlightbits = 0;

  plane: MplaneT | null = null;
  flags = 0;

  firstedge = 0; // look up in model->surfedges[], negative numbers
  numedges = 0; // are backwards edges

  // surface generation data
  cachespots: (SurfcacheT | null)[] = new Array<SurfcacheT | null>(MIPLEVELS).fill(null);

  texturemins: [number, number] = [0, 0];
  extents: [number, number] = [0, 0];

  texinfo: MtexinfoT | null = null;

  // lighting info
  styles: number[] = new Array<number>(4).fill(0); // MAXLIGHTMAPS
  samples: Uint8Array | null = null; // [numstyles*surfsize]

  nextalphasurface: MsurfaceT | null = null;
}

export const CONTENTS_NODE = -1;

// mnode_t and mleaf_t are two independent C structs that share a leading
// "common with leaf"/"common with node" field prefix so a node's
// `children[2]` can point at either; contents !== CONTENTS_NODE is the C
// idiom for telling them apart (`if (node->contents != CONTENTS_NODE) ...
// leaf`). Modeled here as a discriminated union over that same field
// instead of a cast.
export type MnodeOrLeaf = MnodeT | MleafT;

export function isMleaf(n: MnodeOrLeaf): n is MleafT {
  return n.contents !== CONTENTS_NODE;
}

export class MnodeT {
  // common with leaf
  contents: number = CONTENTS_NODE; // CONTENTS_NODE, to differentiate from leafs
  visframe = 0; // node needs to be traversed if current

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
  contents = 0; // will be something other than CONTENTS_NODE
  visframe = 0; // node needs to be traversed if current

  minmaxs: number[] = new Array<number>(6).fill(0); // for bounding box culling

  parent: MnodeT | null = null;

  // leaf specific
  cluster = 0;
  area = 0;

  firstmarksurface: MsurfaceT[] = []; // slice into model.marksurfaces starting here
  nummarksurfaces = 0;
  key = 0; // BSP sequence number for leaf's contents
}

//===================================================================

//
// Whole model
//
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

  // solid volume for clipping (sent from server)
  clipbox = false;
  clipmins: Vec3 = vec3();
  clipmaxs: Vec3 = vec3();

  // brush model
  firstmodelsurface = 0;
  nummodelsurfaces = 0;

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
  // straight out of this buffer.
  vis: Uint8Array | null = null;

  lightdata: Uint8Array | null = null;

  // for alias models and sprites
  skins: (ImageT | null)[] = new Array<ImageT | null>(MAX_MD2SKINS).fill(null);
  extradata: unknown = null; // opaque cache blob owned by the (unported) alias/sprite loaders
  extradatasize = 0;
}

export let registration_sequence = 0;

//============================================================================
// r_model.c -- pending. Every function r_model.h/r_local.h attributes to
// r_model.c throws PendingPort until the real module lands; the whole
// module (Mod_LoadBrushModel/Mod_LoadAliasModel/Mod_LoadSpriteModel and the
// rest of the .bsp/.md2/.sp2 loading internals) is a single owning unit.

export function Mod_Init(): void {
  throw new PendingPort("Mod_Init");
}

export function Mod_ClearAll(): void {
  throw new PendingPort("Mod_ClearAll");
}

export function Mod_ForName(name: string, crash: boolean): ModelT {
  throw new PendingPort("Mod_ForName");
}

export function Mod_Extradata(mod: ModelT): unknown {
  throw new PendingPort("Mod_Extradata");
}

export function Mod_TouchModel(name: string): void {
  throw new PendingPort("Mod_TouchModel");
}

export function Mod_PointInLeaf(p: Vec3, model: ModelT): MleafT {
  throw new PendingPort("Mod_PointInLeaf");
}

export function Mod_ClusterPVS(cluster: number, model: ModelT): Uint8Array {
  throw new PendingPort("Mod_ClusterPVS");
}

export function Mod_Modellist_f(): void {
  throw new PendingPort("Mod_Modellist_f");
}

export function Mod_FreeAll(): void {
  throw new PendingPort("Mod_FreeAll");
}

export function Mod_Free(mod: ModelT): void {
  throw new PendingPort("Mod_Free");
}

// declared in r_local.h, defined in r_model.c
export function R_BeginRegistration(model: string): void {
  throw new PendingPort("R_BeginRegistration");
}

export function R_RegisterModel(name: string): ModelT | null {
  throw new PendingPort("R_RegisterModel");
}

export function R_EndRegistration(): void {
  throw new PendingPort("R_EndRegistration");
}
