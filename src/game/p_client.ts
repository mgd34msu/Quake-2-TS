// p_client.c -- pending port
//
// g_local.h attributes these prototypes to files it calls "g_client.c" and
// "g_player.c"; neither file exists in the C source tree. Grepping the
// actual tree shows every one of these functions is defined in p_client.c,
// so that is where they are stubbed.

import type { Vec3 } from "../shared/math";
import { PendingPort } from "../qcommon/pending";
import type { EdictT, GClientT } from "./g_local";

export function respawn(ent: EdictT): void {
  throw new PendingPort("p_client.c:respawn");
}

export function PutClientInServer(ent: EdictT): void {
  throw new PendingPort("p_client.c:PutClientInServer");
}

export function InitClientPersistant(client: GClientT): void {
  throw new PendingPort("p_client.c:InitClientPersistant");
}

export function InitClientResp(client: GClientT): void {
  throw new PendingPort("p_client.c:InitClientResp");
}

export function InitBodyQue(): void {
  throw new PendingPort("p_client.c:InitBodyQue");
}

export function ClientBeginServerFrame(ent: EdictT): void {
  throw new PendingPort("p_client.c:ClientBeginServerFrame");
}

export function player_pain(self: EdictT, other: EdictT, kick: number, damage: number): void {
  throw new PendingPort("p_client.c:player_pain");
}

export function player_die(
  self: EdictT,
  inflictor: EdictT,
  attacker: EdictT,
  damage: number,
  point: Vec3,
): void {
  throw new PendingPort("p_client.c:player_die");
}

export function SP_info_player_start(ent: EdictT): void {
  throw new PendingPort("p_client.c:SP_info_player_start");
}

export function SP_info_player_deathmatch(ent: EdictT): void {
  throw new PendingPort("p_client.c:SP_info_player_deathmatch");
}

export function SP_info_player_coop(ent: EdictT): void {
  throw new PendingPort("p_client.c:SP_info_player_coop");
}

export function SP_info_player_intermission(ent: EdictT): void {
  throw new PendingPort("p_client.c:SP_info_player_intermission");
}
