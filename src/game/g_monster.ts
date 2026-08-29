// g_monster.c -- pending port

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function monster_fire_bullet(
  self: EdictT,
  start: Vec3,
  dir: Vec3,
  damage: number,
  kick: number,
  hspread: number,
  vspread: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_bullet");
}

export function monster_fire_shotgun(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  kick: number,
  hspread: number,
  vspread: number,
  count: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_shotgun");
}

export function monster_fire_blaster(
  self: EdictT,
  start: Vec3,
  dir: Vec3,
  damage: number,
  speed: number,
  flashtype: number,
  effect: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_blaster");
}

export function monster_fire_grenade(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  speed: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_grenade");
}

export function monster_fire_rocket(
  self: EdictT,
  start: Vec3,
  dir: Vec3,
  damage: number,
  speed: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_rocket");
}

export function monster_fire_railgun(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  kick: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_railgun");
}

export function monster_fire_bfg(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  speed: number,
  kick: number,
  damage_radius: number,
  flashtype: number,
): void {
  throw new PendingPort("g_monster.c:monster_fire_bfg");
}

export function M_droptofloor(ent: EdictT): void {
  throw new PendingPort("g_monster.c:M_droptofloor");
}

export function monster_think(self: EdictT): void {
  throw new PendingPort("g_monster.c:monster_think");
}

export function walkmonster_start(self: EdictT): void {
  throw new PendingPort("g_monster.c:walkmonster_start");
}

export function swimmonster_start(self: EdictT): void {
  throw new PendingPort("g_monster.c:swimmonster_start");
}

export function flymonster_start(self: EdictT): void {
  throw new PendingPort("g_monster.c:flymonster_start");
}

export function AttackFinished(self: EdictT, time: number): void {
  throw new PendingPort("g_monster.c:AttackFinished");
}

export function monster_death_use(self: EdictT): void {
  throw new PendingPort("g_monster.c:monster_death_use");
}

export function M_CatagorizePosition(ent: EdictT): void {
  throw new PendingPort("g_monster.c:M_CatagorizePosition");
}

export function M_CheckAttack(self: EdictT): boolean {
  throw new PendingPort("g_monster.c:M_CheckAttack");
}

export function M_FlyCheck(self: EdictT): void {
  throw new PendingPort("g_monster.c:M_FlyCheck");
}

export function M_CheckGround(ent: EdictT): void {
  throw new PendingPort("g_monster.c:M_CheckGround");
}
