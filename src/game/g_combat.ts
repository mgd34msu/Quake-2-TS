// g_combat.c -- pending port

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function OnSameTeam(ent1: EdictT, ent2: EdictT): boolean {
  throw new PendingPort("g_combat.c:OnSameTeam");
}

export function CanDamage(targ: EdictT, inflictor: EdictT): boolean {
  throw new PendingPort("g_combat.c:CanDamage");
}

export function T_Damage(
  targ: EdictT,
  inflictor: EdictT,
  attacker: EdictT,
  dir: Vec3,
  point: Vec3,
  normal: Vec3,
  damage: number,
  knockback: number,
  dflags: number,
  mod: number,
): void {
  throw new PendingPort("g_combat.c:T_Damage");
}

export function T_RadiusDamage(
  inflictor: EdictT,
  attacker: EdictT,
  damage: number,
  ignore: EdictT | null,
  radius: number,
  mod: number,
): void {
  throw new PendingPort("g_combat.c:T_RadiusDamage");
}
