// sv_ccmds.c -- pending stub (PORTING.md "Pending stubs"). server.h only
// declares SV_ReadLevelFile/SV_Status_f from this file (the rest of
// sv_ccmds.c is console-command plumbing -- map/kick/status/save/load/etc --
// registered by SV_InitOperatorCommands, which server.h misattributes to
// sv_main.c; see sv_main.ts's report for why SV_Init does not call it yet).

import { PendingPort } from "../qcommon/pending";

export function SV_ReadLevelFile(): void {
  throw new PendingPort("SV_ReadLevelFile");
}

export function SV_Status_f(): void {
  throw new PendingPort("SV_Status_f");
}
