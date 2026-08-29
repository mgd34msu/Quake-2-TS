// sv_ents.c -- pending stub (PORTING.md "Pending stubs"). The real unit
// ports per-client frame building/delta compression (SV_BuildClientFrame,
// SV_WriteFrameToClient) and server-demo recording.

import type { ClientT } from "./server";
import type { SizeBuf } from "../qcommon/sizebuf";
import { PendingPort } from "../qcommon/pending";

export function SV_WriteFrameToClient(_client: ClientT, _msg: SizeBuf): void {
  throw new PendingPort("SV_WriteFrameToClient");
}

export function SV_RecordDemoMessage(): void {
  throw new PendingPort("SV_RecordDemoMessage");
}

export function SV_BuildClientFrame(_client: ClientT): void {
  throw new PendingPort("SV_BuildClientFrame");
}
