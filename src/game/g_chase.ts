// g_chase.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function UpdateChaseCam(ent: EdictT): void {
  throw new PendingPort("g_chase.c:UpdateChaseCam");
}

export function ChaseNext(ent: EdictT): void {
  throw new PendingPort("g_chase.c:ChaseNext");
}

export function ChasePrev(ent: EdictT): void {
  throw new PendingPort("g_chase.c:ChasePrev");
}

export function GetChaseTarget(ent: EdictT): void {
  throw new PendingPort("g_chase.c:GetChaseTarget");
}
