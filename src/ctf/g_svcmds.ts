// g_svcmds.c
//
// ctf/g_svcmds.c drops the entire packet-filtering subsystem (StringToFilter,
// SV_FilterPacket, ipfilters[], SVCmd_AddIP_f/RemoveIP_f/ListIP_f/WriteIP_f,
// and the "sv addip/removeip/listip/writeip" ServerCommand dispatch) --
// ctf/g_main.c and ctf/g_local.h no longer declare `filterban` or the
// ipfilter_t array at all.
//
// Deviation: src/ctf/p_client.ts (owned by a concurrent p_client-delta
// worker, out of this unit's SCOPE) still imports SV_FilterPacket from this
// module and calls it from ClientConnect, matching the *pre-ctf* game/p_client.c
// shape. ctf/p_client.c has no such call (grep confirms no SV_FilterPacket
// reference anywhere under quake-2-c/ctf). Removing SV_FilterPacket here to
// match the C delta exactly would leave that import dangling until the
// p_client sibling lands its own delta (dropping the `import { SV_FilterPacket
// } from "./g_svcmds"` and the `if (SV_FilterPacket(value))` block in
// ClientConnect) -- flagged as a follow-up for the coordinator/p_client
// worker rather than silently patched here.

import { PRINT_HIGH, Q_stricmp } from "../shared/q_shared";
import { gi } from "./g_local";

/*
=================
ServerCommand

ServerCommand will be called when an "sv" command is issued.
The game can issue gi.argc() / gi.argv() commands to get the rest
of the parameters
=================
*/
export function Svcmd_Test_f(): void {
  gi.cprintf(null, PRINT_HIGH, "Svcmd_Test_f()\n");
}

export function ServerCommand(): void {
  const cmd = gi.argv(1);
  if (Q_stricmp(cmd, "test") === 0) Svcmd_Test_f();
  else gi.cprintf(null, PRINT_HIGH, `Unknown server command "${cmd}"\n`);
}
