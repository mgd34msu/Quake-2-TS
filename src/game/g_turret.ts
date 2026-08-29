// g_turret.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SP_turret_breach(self: EdictT): void {
  throw new PendingPort("g_turret.c:SP_turret_breach");
}

export function SP_turret_base(self: EdictT): void {
  throw new PendingPort("g_turret.c:SP_turret_base");
}

export function SP_turret_driver(self: EdictT): void {
  throw new PendingPort("g_turret.c:SP_turret_driver");
}
