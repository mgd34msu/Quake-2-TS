// p_hud.c -- pending port
//
// g_local.h attributes `BeginIntermission` to the file it calls
// "g_client.c" (which does not exist); grepping the C tree shows it is
// actually defined in p_hud.c, alongside the rest of this file's exports.

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function MoveClientToIntermission(client: EdictT): void {
  throw new PendingPort("p_hud.c:MoveClientToIntermission");
}

export function G_SetStats(ent: EdictT): void {
  throw new PendingPort("p_hud.c:G_SetStats");
}

export function G_SetSpectatorStats(ent: EdictT): void {
  throw new PendingPort("p_hud.c:G_SetSpectatorStats");
}

export function G_CheckChaseStats(ent: EdictT): void {
  throw new PendingPort("p_hud.c:G_CheckChaseStats");
}

export function DeathmatchScoreboardMessage(client: EdictT, killer: EdictT | null): void {
  throw new PendingPort("p_hud.c:DeathmatchScoreboardMessage");
}

export function BeginIntermission(targ: EdictT): void {
  throw new PendingPort("p_hud.c:BeginIntermission");
}
