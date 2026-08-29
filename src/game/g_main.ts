// g_main.c

import { VectorCopy } from "../shared/math";
import { Com_sprintf, type CvarT, DF_SAME_LEVEL, PRINT_HIGH, Q_stricmp, type UsercmdT } from "../shared/q_shared";
import { PendingPort } from "../qcommon/pending";
import { AI_SetSightClient } from "./g_ai";
import { ClientCommand } from "./g_cmds";
import { type Edict, GAME_API_VERSION, type GameExports, type GameImports, SVF_MONSTER } from "./game";
import {
  type EdictT,
  FL_FLY,
  FL_SWIM,
  FRAMETIME,
  g_edicts,
  game,
  gameCvars,
  gi,
  globals,
  level,
  SetGameExports,
  SetGameImports,
} from "./g_local";
import { M_CheckGround } from "./g_monster";
import { G_RunEntity } from "./g_phys";
import { ClientBeginServerFrame } from "./p_client";
import { ClientEndServerFrame } from "./p_view";
import { BeginIntermission } from "./p_hud";
import { ServerCommand } from "./g_svcmds";
import { G_Find, G_Spawn } from "./g_utils";
import { SpawnEntities } from "./g_spawn";



// gameCvars entries are `CvarT | null` until InitGame resolves them via
// gi.cvar() (see g_local.ts's gameCvars comment); C dereferences the cvar
// pointer directly (`maxclients->value`), which is undefined behavior if the
// pointer is still NULL. These two helpers give the TS equivalent of "not
// resolved yet" a defined value (0 / "") instead of crashing, since there is
// no null pointer to dereference on this side of the port.
function cvarNum(c: CvarT | null): number {
  return c === null ? 0 : c.value;
}
function cvarStr(c: CvarT | null): string {
  return c === null ? "" : c.string;
}

//===================================================================

export function ShutdownGame(): void {
  gi.dprintf("==== ShutdownGame ====\n");

  // gi.FreeTags(TAG_LEVEL) / gi.FreeTags(TAG_GAME) dropped: GameImports has
  // no FreeTags member (see game.ts's TagMalloc/TagFree/FreeTags comment) --
  // there is no tag-based allocator on this side of the port.
}

// -------------------------------------------------------------------------
// GameExports members whose owning C function has not been exported by its
// sibling module yet. Each throws PendingPort naming the real C source
// location; delete the placeholder here and import the real function once
// that sibling module lands (coordinator integration, per this unit's
// brief).
// -------------------------------------------------------------------------

// g_save.c has no src/game/g_save.ts sibling yet.
function InitGame(): void {
  throw new PendingPort("g_save.c:InitGame");
}
function WriteGame(filename: string, autosave: boolean): void {
  throw new PendingPort("g_save.c:WriteGame");
}
function ReadGame(filename: string): void {
  throw new PendingPort("g_save.c:ReadGame");
}
function WriteLevel(filename: string): void {
  throw new PendingPort("g_save.c:WriteLevel");
}
function ReadLevel(filename: string): void {
  throw new PendingPort("g_save.c:ReadLevel");
}

// g_local.h attributes these four to "g_client.c" (a file that does not
// exist in the C tree -- see p_client.ts's own header comment); grepping
// the C tree shows their real definitions live in p_client.c, but
// p_client.ts does not export them yet.
function ClientConnect(ent: Edict, userinfo: string): { allowed: boolean; userinfo: string } {
  throw new PendingPort("p_client.c:ClientConnect");
}
function ClientBegin(ent: Edict): void {
  throw new PendingPort("p_client.c:ClientBegin");
}
function ClientUserinfoChanged(ent: Edict, userinfo: string): void {
  throw new PendingPort("p_client.c:ClientUserinfoChanged");
}
function ClientDisconnect(ent: Edict): void {
  throw new PendingPort("p_client.c:ClientDisconnect");
}
function ClientThink(ent: Edict, cmd: UsercmdT): void {
  throw new PendingPort("p_client.c:ClientThink");
}

/*
=================
GetGameAPI

Returns a pointer to the structure with all entry points
and global variables
=================
*/
export function GetGameAPI(imports: GameImports): GameExports {
  SetGameImports(imports);

  const exportsObj: GameExports = {
    apiversion: GAME_API_VERSION,
    Init: InitGame,
    Shutdown: ShutdownGame,
    SpawnEntities,

    WriteGame,
    ReadGame,
    WriteLevel,
    ReadLevel,

    ClientConnect,
    ClientBegin,
    ClientUserinfoChanged,
    ClientDisconnect,
    ClientCommand,
    ClientThink,

    RunFrame: G_RunFrame,

    ServerCommand,

    // `edict_size` is dropped entirely (see game.ts's GameExports comment).
    // C's GetGameAPI does not populate edicts/num_edicts/max_edicts either
    // -- InitGame does that later -- so they start at their C
    // zero-initialized-struct equivalents.
    edicts: [],
    num_edicts: 0,
    max_edicts: 0,
  };

  SetGameExports(exportsObj);
  return exportsObj;
}

// this is only here so the functions in q_shared.c and q_shwin.c can link
// under `#ifndef GAME_HARD_LINKED` -- Sys_Error and Com_Printf are real
// implementations in src/platform/sys.ts and src/qcommon/common.ts in this
// port (there is no separate game DLL boundary to hard-link against), so
// this linkage shim is dead code here and is dropped.

//======================================================================

/*
=================
ClientEndServerFrames
=================
*/
export function ClientEndServerFrames(): void {
  const maxclients = cvarNum(gameCvars.maxclients);

  // calc the player views now that all pushing
  // and damage has been added
  for (let i = 0; i < maxclients; i++) {
    const ent = g_edicts[1 + i];
    if (!ent.inuse || ent.client === null) continue;
    ClientEndServerFrame(ent);
  }
}

/*
=================
CreateTargetChangeLevel

Returns the created target changelevel
=================
*/
export function CreateTargetChangeLevel(map: string): EdictT {
  const ent = G_Spawn();
  ent.classname = "target_changelevel";
  level.nextmap = Com_sprintf("%s", map);
  ent.map = level.nextmap;
  return ent;
}

/*
=================
EndDMLevel

The timelimit or fraglimit has been exceeded
=================
*/
export function EndDMLevel(): void {
  // stay on same level flag
  if ((cvarNum(gameCvars.dmflags) & DF_SAME_LEVEL) !== 0) {
    BeginIntermission(CreateTargetChangeLevel(level.mapname));
    return;
  }

  // see if it's in the map list
  const maplist = cvarStr(gameCvars.sv_maplist);
  if (maplist.length > 0) {
    const seps = /[ ,\n\r]+/;
    const tokens = maplist.split(seps).filter((tok) => tok.length > 0);
    let f: string | null = null;
    for (let idx = 0; idx < tokens.length; idx++) {
      const t = tokens[idx];
      if (Q_stricmp(t, level.mapname) === 0) {
        // it's in the list, go to the next one
        const next = tokens[idx + 1];
        if (next === undefined) {
          // end of list, go to first one
          if (f === null) {
            // there isn't a first one, same level
            BeginIntermission(CreateTargetChangeLevel(level.mapname));
          } else {
            BeginIntermission(CreateTargetChangeLevel(f));
          }
        } else {
          BeginIntermission(CreateTargetChangeLevel(next));
        }
        return;
      }
      if (f === null) f = t;
    }
  }

  if (level.nextmap.length > 0) {
    // go to a specific map
    BeginIntermission(CreateTargetChangeLevel(level.nextmap));
  } else {
    // search for a changelevel
    //
    // FOFS(classname) dies at the call site per PORTING.md's "field-offset
    // macros die at the call site" ruling: the literal property name
    // "classname" replaces the FOFS() numeric offset.
    const ent = G_Find(null, "classname", "target_changelevel");
    if (ent === null) {
      // the map designer didn't include a changelevel,
      // so create a fake ent that goes back to the same level
      BeginIntermission(CreateTargetChangeLevel(level.mapname));
      return;
    }
    BeginIntermission(ent);
  }
}

/*
=================
CheckDMRules
=================
*/
export function CheckDMRules(): void {
  if (level.intermissiontime !== 0) return;

  if (cvarNum(gameCvars.deathmatch) === 0) return;

  const timelimit = cvarNum(gameCvars.timelimit);
  if (timelimit !== 0) {
    if (level.time >= timelimit * 60) {
      gi.bprintf(PRINT_HIGH, "Timelimit hit.\n");
      EndDMLevel();
      return;
    }
  }

  const fraglimit = cvarNum(gameCvars.fraglimit);
  if (fraglimit !== 0) {
    const maxclients = cvarNum(gameCvars.maxclients);
    for (let i = 0; i < maxclients; i++) {
      const cl = game.clients[i];
      if (!g_edicts[i + 1].inuse) continue;

      if (cl.resp.score >= fraglimit) {
        gi.bprintf(PRINT_HIGH, "Fraglimit hit.\n");
        EndDMLevel();
        return;
      }
    }
  }
}

/*
=============
ExitLevel
=============
*/
export function ExitLevel(): void {
  // level.changemap is always populated by the caller before
  // exitintermission is set (see the C comment on ExitLevel's callers); the
  // `?? ""` fallback exists only to satisfy TS's `string | null` typing of
  // level.changemap, not to change behavior.
  const command = Com_sprintf('gamemap "%s"\n', level.changemap ?? "");
  gi.AddCommandString(command);
  level.changemap = null;
  level.exitintermission = 0;
  level.intermissiontime = 0;
  ClientEndServerFrames();

  // clear some things before going to next level
  const maxclients = cvarNum(gameCvars.maxclients);
  for (let i = 0; i < maxclients; i++) {
    const ent = g_edicts[1 + i];
    if (!ent.inuse) continue;
    if (ent.client !== null && ent.health > ent.client.pers.max_health) {
      ent.health = ent.client.pers.max_health;
    }
  }
}

/*
================
G_RunFrame

Advances the world by 0.1 seconds
================
*/
export function G_RunFrame(): void {
  level.framenum++;
  level.time = level.framenum * FRAMETIME;

  // choose a client for monsters to target this frame
  AI_SetSightClient();

  // exit intermissions

  if (level.exitintermission !== 0) {
    ExitLevel();
    return;
  }

  //
  // treat each object in turn
  // even the world gets a chance to think
  //
  for (let i = 0; i < globals.num_edicts; i++) {
    const ent = g_edicts[i];
    if (!ent.inuse) continue;

    level.current_entity = ent;

    VectorCopy(ent.s.origin, ent.s.old_origin);

    // if the ground entity moved, make sure we are still on it
    if (ent.groundentity !== null && ent.groundentity.linkcount !== ent.groundentity_linkcount) {
      ent.groundentity = null;
      if ((ent.flags & (FL_SWIM | FL_FLY)) === 0 && (ent.svflags & SVF_MONSTER) !== 0) {
        M_CheckGround(ent);
      }
    }

    const maxclients = cvarNum(gameCvars.maxclients);
    if (i > 0 && i <= maxclients) {
      ClientBeginServerFrame(ent);
      continue;
    }

    G_RunEntity(ent);
  }

  // see if it is time to end a deathmatch
  CheckDMRules();

  // build the playerstate_t structures for all players
  ClientEndServerFrames();
}
