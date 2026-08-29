// sv_world.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// ports the area-node BSP used for entity culling/linking (SV_LinkEdict/
// SV_UnlinkEdict/SV_AreaEdicts) and the world trace/point-contents wrappers
// that combine CM_* collision with entity-vs-entity clipping.

import type { Vec3 } from "../shared/math";
import type { Edict, GTraceT } from "../game/game";
import { PendingPort } from "../qcommon/pending";

// called after the world model has been loaded, before linking any entities
export function SV_ClearWorld(): void {
  throw new PendingPort("SV_ClearWorld");
}

// call before removing an entity, and before trying to move one,
// so it doesn't clip against itself
export function SV_UnlinkEdict(_ent: Edict): void {
  throw new PendingPort("SV_UnlinkEdict");
}

// Needs to be called any time an entity changes origin, mins, maxs,
// or solid. Automatically unlinks if needed.
// sets ent.absmin and ent.absmax
// sets ent.clusternums[] for pvs determination even if the entity
// is not solid
export function SV_LinkEdict(_ent: Edict): void {
  throw new PendingPort("SV_LinkEdict");
}

// fills in a table of edict pointers with edicts that have bounding boxes
// that intersect the given area. It is possible for a non-axial bmodel
// to be returned that doesn't actually intersect the area on an exact test.
// returns the number of pointers filled in
export function SV_AreaEdicts(_mins: Vec3, _maxs: Vec3, _list: Edict[], _maxcount: number, _areatype: number): number {
  throw new PendingPort("SV_AreaEdicts");
}

// returns the CONTENTS_* value from the world at the given point.
// Quake 2 extends this to also check entities, to allow moving liquids
export function SV_PointContents(_p: Vec3): number {
  throw new PendingPort("SV_PointContents");
}

// mins and maxs are relative. passedict is explicitly excluded from
// clipping checks (normally null)
export function SV_Trace(_start: Vec3, _mins: Vec3 | null, _maxs: Vec3 | null, _end: Vec3, _passedict: Edict | null, _contentmask: number): GTraceT {
  throw new PendingPort("SV_Trace");
}
