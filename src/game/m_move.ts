// m_move.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function M_CheckBottom(ent: EdictT): boolean {
  throw new PendingPort("m_move.c:M_CheckBottom");
}

export function M_walkmove(ent: EdictT, yaw: number, dist: number): boolean {
  throw new PendingPort("m_move.c:M_walkmove");
}

export function M_MoveToGoal(ent: EdictT, dist: number): void {
  throw new PendingPort("m_move.c:M_MoveToGoal");
}

export function M_ChangeYaw(ent: EdictT): void {
  throw new PendingPort("m_move.c:M_ChangeYaw");
}
