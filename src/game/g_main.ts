// g_main.c -- pending port
//
// g_main.c also defines InitGame/ShutdownGame/SpawnEntities/G_RunFrame and
// friends, and assembles the game_export_t table -- but those are typed as
// GameExports interface members in game.ts, not separate prototypes
// attributed via g_local.h, so they are not stubbed here.

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SaveClientData(): void {
  throw new PendingPort("g_main.c:SaveClientData");
}

export function FetchClientEntData(ent: EdictT): void {
  throw new PendingPort("g_main.c:FetchClientEntData");
}
