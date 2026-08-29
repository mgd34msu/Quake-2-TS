// cl_main.c -- pending stub (PORTING.md "Pending stubs"). Connection
// lifecycle, frame pump, and demo recording. Cmd_ForwardToServer/
// CL_Setenv_f/CL_ForwardToServer_f/CL_Pause_f/CL_Drop/
// CL_SendConnectPacket/CL_CheckForResend/CL_Connect_f/CL_Rcon_f/
// CL_Packet_f/CL_Changing_f/CL_Reconnect_f/CL_ParseStatusMessage/
// CL_Skins_f/CL_ConnectionlessPacket/CL_DumpPackets/CL_Userinfo_f/
// CL_Precache_f/CL_InitLocal/CL_WriteConfiguration/CL_FixCvarCheats/
// CL_SendCommand/CL_Frame/CL_Shutdown are internal to cl_main.c and are not
// stubbed here.
//
// client.h declares `void CL_GetChallengePacket (void);` under this file's
// section, but it is never defined anywhere in the v3.19 client tree
// (confirmed by grep) -- a dead declaration, dropped and reported.
//
// client.h also misattributes CL_ClearState and CL_ReadPackets to its
// "cl_input" comment section; both are actually defined in cl_main.c
// (confirmed by grep) and are exported from here instead. There is no
// cl_demo.c file in the v3.19 tree -- client.h's "cl_demo.c" comment
// section (CL_WriteDemoMessage/CL_Stop_f/CL_Record_f) is likewise stale;
// all three are defined in cl_main.c and are exported from here too.

import { PendingPort } from "../qcommon/pending";

export function CL_Quit_f(): void {
  throw new PendingPort("CL_Quit_f");
}

export function CL_Init(): void {
  throw new PendingPort("CL_Init");
}

export function CL_FixUpGender(): void {
  throw new PendingPort("CL_FixUpGender");
}

export function CL_Disconnect(): void {
  throw new PendingPort("CL_Disconnect");
}

export function CL_Disconnect_f(): void {
  throw new PendingPort("CL_Disconnect_f");
}

export function CL_PingServers_f(): void {
  throw new PendingPort("CL_PingServers_f");
}

export function CL_Snd_Restart_f(): void {
  throw new PendingPort("CL_Snd_Restart_f");
}

export function CL_RequestNextDownload(): void {
  throw new PendingPort("CL_RequestNextDownload");
}

export function CL_ClearState(): void {
  throw new PendingPort("CL_ClearState");
}

export function CL_ReadPackets(): void {
  throw new PendingPort("CL_ReadPackets");
}

export function CL_WriteDemoMessage(): void {
  throw new PendingPort("CL_WriteDemoMessage");
}

export function CL_Stop_f(): void {
  throw new PendingPort("CL_Stop_f");
}

export function CL_Record_f(): void {
  throw new PendingPort("CL_Record_f");
}
