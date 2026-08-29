// g_utils.c -- pending port

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function KillBox(ent: EdictT): boolean {
  throw new PendingPort("g_utils.c:KillBox");
}

export function G_ProjectSource(point: Vec3, distance: Vec3, forward: Vec3, right: Vec3, result: Vec3): void {
  throw new PendingPort("g_utils.c:G_ProjectSource");
}

// `fieldofs` is C's `int fieldofs`, a byte offset produced by the now-dropped
// FOFS macro (see g_local.ts's FieldT comment). Kept as a number for now;
// the real port should redesign this as a property-name-based lookup.
export function G_Find(from: EdictT | null, fieldofs: number, match: string): EdictT | null {
  throw new PendingPort("g_utils.c:G_Find");
}

export function findradius(from: EdictT | null, org: Vec3, rad: number): EdictT | null {
  throw new PendingPort("g_utils.c:findradius");
}

export function G_PickTarget(targetname: string): EdictT | null {
  throw new PendingPort("g_utils.c:G_PickTarget");
}

export function G_UseTargets(ent: EdictT, activator: EdictT | null): void {
  throw new PendingPort("g_utils.c:G_UseTargets");
}

export function G_SetMovedir(angles: Vec3, movedir: Vec3): void {
  throw new PendingPort("g_utils.c:G_SetMovedir");
}

export function G_InitEdict(e: EdictT): void {
  throw new PendingPort("g_utils.c:G_InitEdict");
}

export function G_Spawn(): EdictT {
  throw new PendingPort("g_utils.c:G_Spawn");
}

export function G_FreeEdict(e: EdictT): void {
  throw new PendingPort("g_utils.c:G_FreeEdict");
}

export function G_TouchTriggers(ent: EdictT): void {
  throw new PendingPort("g_utils.c:G_TouchTriggers");
}

export function G_TouchSolids(ent: EdictT): void {
  throw new PendingPort("g_utils.c:G_TouchSolids");
}

// C parameter name `in` is a reserved word in TypeScript; renamed `inStr`.
export function G_CopyString(inStr: string): string {
  throw new PendingPort("g_utils.c:G_CopyString");
}

export function tv(x: number, y: number, z: number): Vec3 {
  throw new PendingPort("g_utils.c:tv");
}

export function vtos(v: Vec3): string {
  throw new PendingPort("g_utils.c:vtos");
}

export function vectoyaw(vec: Vec3): number {
  throw new PendingPort("g_utils.c:vectoyaw");
}

export function vectoangles(vec: Vec3, angles: Vec3): void {
  throw new PendingPort("g_utils.c:vectoangles");
}
