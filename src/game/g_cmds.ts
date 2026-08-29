// g_cmds.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function Cmd_Help_f(ent: EdictT): void {
  throw new PendingPort("g_cmds.c:Cmd_Help_f");
}

export function Cmd_Score_f(ent: EdictT): void {
  throw new PendingPort("g_cmds.c:Cmd_Score_f");
}

// g_local.h's comment attributes this to p_hud.c, but it is actually
// defined in g_cmds.c (verified by grepping the C source); PORTING.md says
// the C source wins when the header attribution is wrong.
export function ValidateSelectedItem(ent: EdictT): void {
  throw new PendingPort("g_cmds.c:ValidateSelectedItem");
}
