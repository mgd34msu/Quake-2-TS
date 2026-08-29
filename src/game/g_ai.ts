// g_ai.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function AI_SetSightClient(): void {
  throw new PendingPort("g_ai.c:AI_SetSightClient");
}

export function ai_stand(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_stand");
}

export function ai_move(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_move");
}

export function ai_walk(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_walk");
}

export function ai_turn(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_turn");
}

export function ai_run(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_run");
}

export function ai_charge(self: EdictT, dist: number): void {
  throw new PendingPort("g_ai.c:ai_charge");
}

export function range(self: EdictT, other: EdictT): number {
  throw new PendingPort("g_ai.c:range");
}

export function FoundTarget(self: EdictT): void {
  throw new PendingPort("g_ai.c:FoundTarget");
}

export function infront(self: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_ai.c:infront");
}

export function visible(self: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_ai.c:visible");
}

export function FacingIdeal(self: EdictT): boolean {
  throw new PendingPort("g_ai.c:FacingIdeal");
}
