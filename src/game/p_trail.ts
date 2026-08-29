// p_trail.c -- pending port
//
// g_local.h calls this file "g_ptrail.c", which does not exist; grepping
// the C tree shows these functions are defined in p_trail.c.

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function PlayerTrail_Init(): void {
  throw new PendingPort("p_trail.c:PlayerTrail_Init");
}

export function PlayerTrail_Add(spot: Vec3): void {
  throw new PendingPort("p_trail.c:PlayerTrail_Add");
}

export function PlayerTrail_New(spot: Vec3): void {
  throw new PendingPort("p_trail.c:PlayerTrail_New");
}

export function PlayerTrail_PickFirst(self: EdictT): EdictT | null {
  throw new PendingPort("p_trail.c:PlayerTrail_PickFirst");
}

export function PlayerTrail_PickNext(self: EdictT): EdictT | null {
  throw new PendingPort("p_trail.c:PlayerTrail_PickNext");
}

export function PlayerTrail_LastSpot(): EdictT | null {
  throw new PendingPort("p_trail.c:PlayerTrail_LastSpot");
}
