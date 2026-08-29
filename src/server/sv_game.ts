// sv_game.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// wires the engine side of the game import/export boundary (loading the game
// module, building the `GameImports` object, GetGameAPI); until then every
// function here throws PendingPort so callers fail loudly instead of
// silently no-opping.
//
// `geHolder` is a plain mutable holder (see server.ts's `svClientHolder`/
// `svPlayerHolder` for the same pattern and rationale): tests inject a fake
// `GameExports` directly into `geHolder.ge` without needing SV_InitGameProgs
// to run first.

import type { GameExports } from "../game/game";
import type { Edict } from "../game/game";
import { PendingPort } from "../qcommon/pending";

export const geHolder: { ge: GameExports | null } = { ge: null };

export function SV_InitGameProgs(): void {
  throw new PendingPort("SV_InitGameProgs");
}

export function SV_ShutdownGameProgs(): void {
  throw new PendingPort("SV_ShutdownGameProgs");
}

export function SV_InitEdict(_e: Edict): void {
  throw new PendingPort("SV_InitEdict");
}
