// p_weapon.c -- pending port
//
// g_local.h calls this file "g_pweapon.c" (does not exist) for
// `PlayerNoise`. The other 14 functions here are forward-declared as
// `extern` at the top of g_items.c (its itemlist table references them);
// grepping the C tree confirms all 14 are actually defined in p_weapon.c,
// not g_items.c, so they are attributed here per PORTING.md.

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT, GItemT } from "./g_local";

export function PlayerNoise(who: EdictT, where: Vec3, noiseType: number): void {
  throw new PendingPort("p_weapon.c:PlayerNoise");
}

export function Pickup_Weapon(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("p_weapon.c:Pickup_Weapon");
}

export function Use_Weapon(ent: EdictT, item: GItemT): void {
  throw new PendingPort("p_weapon.c:Use_Weapon");
}

export function Drop_Weapon(ent: EdictT, item: GItemT): void {
  throw new PendingPort("p_weapon.c:Drop_Weapon");
}

export function Weapon_Blaster(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Blaster");
}

export function Weapon_Shotgun(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Shotgun");
}

export function Weapon_SuperShotgun(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_SuperShotgun");
}

export function Weapon_Machinegun(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Machinegun");
}

export function Weapon_Chaingun(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Chaingun");
}

export function Weapon_HyperBlaster(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_HyperBlaster");
}

export function Weapon_RocketLauncher(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_RocketLauncher");
}

export function Weapon_Grenade(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Grenade");
}

export function Weapon_GrenadeLauncher(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_GrenadeLauncher");
}

export function Weapon_Railgun(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_Railgun");
}

export function Weapon_BFG(ent: EdictT): void {
  throw new PendingPort("p_weapon.c:Weapon_BFG");
}
