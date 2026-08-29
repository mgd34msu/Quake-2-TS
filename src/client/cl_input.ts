// cl_input.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// ports keybutton tracking (KeyDown/KeyUp and the IN_*Down/IN_*Up bindings),
// CL_AdjustAngles/CL_ClampPitch/CL_FinishMove (internal to cl_input.c), and
// CL_SendCmd's usercmd construction. in_mlook/in_klook/in_strafe/in_speed
// are ported in client.ts (see that file's ownership note); this stub only
// exports the functions client.h declares.
//
// client.h misattributes CL_ClearState and CL_ReadPackets to this file's
// section; both are actually defined in cl_main.c (confirmed by grep) and
// are ported in cl_main.ts instead. CL_SendMove/CL_ReadFromServer/
// CL_WriteToServer/CL_ParseLayout are declared in client.h but never
// defined anywhere in the v3.19 client tree -- dead declarations, dropped
// and reported. Key_KeynumToString is declared here too but is actually
// defined in keys.c; ported in keys_impl.ts instead.

import { PendingPort } from "../qcommon/pending";
import type { UsercmdT } from "../shared/q_shared";
import type { KbuttonT } from "./client";

export function CL_InitInput(): void {
  throw new PendingPort("CL_InitInput");
}

export function CL_SendCmd(): void {
  throw new PendingPort("CL_SendCmd");
}

export function CL_BaseMove(_cmd: UsercmdT): void {
  throw new PendingPort("CL_BaseMove");
}

export function IN_CenterView(): void {
  throw new PendingPort("IN_CenterView");
}

export function CL_KeyState(_key: KbuttonT): number {
  throw new PendingPort("CL_KeyState");
}
