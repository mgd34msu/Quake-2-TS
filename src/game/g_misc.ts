// g_misc.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

// C parameter name is `type`, which shadows the TS `type` keyword context;
// renamed to `gibType` for clarity, per PORTING.md naming discretion.
export function ThrowHead(self: EdictT, gibname: string, damage: number, gibType: number): void {
  throw new PendingPort("g_misc.c:ThrowHead");
}

export function ThrowClientHead(self: EdictT, damage: number): void {
  throw new PendingPort("g_misc.c:ThrowClientHead");
}

export function ThrowGib(self: EdictT, gibname: string, damage: number, gibType: number): void {
  throw new PendingPort("g_misc.c:ThrowGib");
}

export function BecomeExplosion1(self: EdictT): void {
  throw new PendingPort("g_misc.c:BecomeExplosion1");
}

export function SP_func_areaportal(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_func_areaportal");
}

export function SP_func_clock(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_func_clock");
}

export function SP_func_explosive(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_func_explosive");
}

export function SP_func_object(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_func_object");
}

export function SP_func_wall(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_func_wall");
}

export function SP_info_notnull(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_info_notnull");
}

export function SP_info_null(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_info_null");
}

export function SP_light(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_light");
}

export function SP_light_mine1(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_light_mine1");
}

export function SP_light_mine2(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_light_mine2");
}

export function SP_misc_banner(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_banner");
}

export function SP_misc_bigviper(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_bigviper");
}

export function SP_misc_blackhole(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_blackhole");
}

export function SP_misc_deadsoldier(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_deadsoldier");
}

export function SP_misc_easterchick(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_easterchick");
}

export function SP_misc_easterchick2(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_easterchick2");
}

export function SP_misc_eastertank(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_eastertank");
}

export function SP_misc_explobox(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_explobox");
}

export function SP_misc_gib_arm(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_gib_arm");
}

export function SP_misc_gib_head(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_gib_head");
}

export function SP_misc_gib_leg(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_gib_leg");
}

export function SP_misc_satellite_dish(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_satellite_dish");
}

export function SP_misc_strogg_ship(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_strogg_ship");
}

export function SP_misc_teleporter(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_teleporter");
}

export function SP_misc_teleporter_dest(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_teleporter_dest");
}

export function SP_misc_viper(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_viper");
}

export function SP_misc_viper_bomb(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_misc_viper_bomb");
}

export function SP_monster_commander_body(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_monster_commander_body");
}

export function SP_path_corner(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_path_corner");
}

export function SP_point_combat(self: EdictT): void {
  throw new PendingPort("g_misc.c:SP_point_combat");
}

export function SP_target_character(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_target_character");
}

export function SP_target_string(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_target_string");
}

export function SP_viewthing(ent: EdictT): void {
  throw new PendingPort("g_misc.c:SP_viewthing");
}
