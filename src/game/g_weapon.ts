// g_weapon.c -- pending port

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function ThrowDebris(self: EdictT, modelname: string, speed: number, origin: Vec3): void {
  throw new PendingPort("g_weapon.c:ThrowDebris");
}

export function fire_hit(self: EdictT, aim: Vec3, damage: number, kick: number): boolean {
  throw new PendingPort("g_weapon.c:fire_hit");
}

export function fire_bullet(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  kick: number,
  hspread: number,
  vspread: number,
  mod: number,
): void {
  throw new PendingPort("g_weapon.c:fire_bullet");
}

export function fire_shotgun(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  kick: number,
  hspread: number,
  vspread: number,
  count: number,
  mod: number,
): void {
  throw new PendingPort("g_weapon.c:fire_shotgun");
}

export function fire_blaster(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  speed: number,
  effect: number,
  hyper: boolean,
): void {
  throw new PendingPort("g_weapon.c:fire_blaster");
}

export function fire_grenade(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  speed: number,
  timer: number,
  damage_radius: number,
): void {
  throw new PendingPort("g_weapon.c:fire_grenade");
}

export function fire_grenade2(
  self: EdictT,
  start: Vec3,
  aimdir: Vec3,
  damage: number,
  speed: number,
  timer: number,
  damage_radius: number,
  held: boolean,
): void {
  throw new PendingPort("g_weapon.c:fire_grenade2");
}

export function fire_rocket(
  self: EdictT,
  start: Vec3,
  dir: Vec3,
  damage: number,
  speed: number,
  damage_radius: number,
  radius_damage: number,
): void {
  throw new PendingPort("g_weapon.c:fire_rocket");
}

export function fire_rail(self: EdictT, start: Vec3, aimdir: Vec3, damage: number, kick: number): void {
  throw new PendingPort("g_weapon.c:fire_rail");
}

export function fire_bfg(
  self: EdictT,
  start: Vec3,
  dir: Vec3,
  damage: number,
  speed: number,
  damage_radius: number,
): void {
  throw new PendingPort("g_weapon.c:fire_bfg");
}
