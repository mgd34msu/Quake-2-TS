// g_spawn.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SP_worldspawn(ent: EdictT): void {
  throw new PendingPort("g_spawn.c:SP_worldspawn");
}
