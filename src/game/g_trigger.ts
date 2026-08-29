// g_trigger.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function SP_trigger_always(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_always");
}

export function SP_trigger_once(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_once");
}

export function SP_trigger_multiple(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_multiple");
}

export function SP_trigger_relay(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_relay");
}

export function SP_trigger_push(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_push");
}

export function SP_trigger_hurt(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_hurt");
}

export function SP_trigger_key(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_key");
}

export function SP_trigger_counter(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_counter");
}

export function SP_trigger_gravity(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_gravity");
}

export function SP_trigger_monsterjump(ent: EdictT): void {
  throw new PendingPort("g_trigger.c:SP_trigger_monsterjump");
}
