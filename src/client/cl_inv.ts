// cl_inv.c -- pending stub (PORTING.md "Pending stubs"). Inv_DrawString/
// SetStringHighBit are internal to cl_inv.c and are not stubbed here.
//
// client.h also declares `void CL_KeyInventory (int key);` under this
// file's section, but no client/*.c file in the v3.19 tree defines it
// (confirmed by grep) -- a dead declaration, dropped and reported.

import { PendingPort } from "../qcommon/pending";

export function CL_ParseInventory(): void {
  throw new PendingPort("CL_ParseInventory");
}

export function CL_DrawInventory(): void {
  throw new PendingPort("CL_DrawInventory");
}
