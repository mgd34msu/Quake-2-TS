// sv_user.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// ports client command execution (SV_ExecuteClientMessage's clc_move/
// clc_userinfo/clc_stringcmd dispatch) and the nextserver cinematic chain.

import type { ClientT } from "./server";
import { PendingPort } from "../qcommon/pending";

export function SV_Nextserver(): void {
  throw new PendingPort("SV_Nextserver");
}

export function SV_ExecuteClientMessage(_cl: ClientT): void {
  throw new PendingPort("SV_ExecuteClientMessage");
}
