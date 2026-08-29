// cl_ents.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// ports entity-baseline delta decoding, per-frame entity/playerstate
// parsing, and view-weapon selection (CL_ParseProjectiles/
// CL_ParsePacketEntities/CL_ParsePlayerstate/CL_AddViewWeapon/
// CL_CalcViewValues are internal to cl_ents.c and are not stubbed here;
// only the functions client.h/sound.h declare are exported).

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { EntityStateT } from "../shared/q_shared";

// C's `int CL_ParseEntityBits (unsigned *bits)` mutates an out-parameter
// and returns the parsed entity number; JS has no out-params, so the
// mutated `bits` value is folded into the return shape instead (mirrors
// PORTING.md's "C helpers that mutate ... return the new value instead").
export function CL_ParseEntityBits(): { number: number; bits: number } {
  throw new PendingPort("CL_ParseEntityBits");
}

export function CL_ParseDelta(_from: EntityStateT, _to: EntityStateT, _number: number, _bits: number): void {
  throw new PendingPort("CL_ParseDelta");
}

export function CL_ParseFrame(): void {
  throw new PendingPort("CL_ParseFrame");
}

export function CL_AddEntities(): void {
  throw new PendingPort("CL_AddEntities");
}

// client.h declares this under its general section; defined in cl_ents.c.
export function CL_GetEntitySoundOrigin(_ent: number, _org: Vec3): void {
  throw new PendingPort("CL_GetEntitySoundOrigin");
}
