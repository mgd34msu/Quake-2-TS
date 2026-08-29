// m_actor.c -- pending port
import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SP_misc_actor(self: EdictT): void {
  throw new PendingPort("m_actor.c:SP_misc_actor");
}

export function SP_target_actor(self: EdictT): void {
  throw new PendingPort("m_actor.c:SP_target_actor");
}
