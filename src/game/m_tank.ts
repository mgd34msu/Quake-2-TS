// m_tank.c -- pending port
//
// Spawned under two classnames in g_spawn.c's spawn table
// ("monster_tank" and "monster_tank_commander"), both mapped to this same
// function.
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SP_monster_tank(self: EdictT): void {
  throw new PendingPort("m_tank.c:SP_monster_tank");
}
