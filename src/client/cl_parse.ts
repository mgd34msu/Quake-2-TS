// cl_parse.c -- pending stub (PORTING.md "Pending stubs"). Server-message
// parsing (CL_ParseServerData/CL_ParseBaseline/CL_ParseDownload/
// CL_ParseStartSoundPacket/CL_DownloadFileName) is internal to cl_parse.c
// except where client.h declares it below.

import { PendingPort } from "../qcommon/pending";
import type { ClientinfoT } from "./client";

export function CL_CheckOrDownloadFile(_filename: string): boolean {
  throw new PendingPort("CL_CheckOrDownloadFile");
}

export function CL_RegisterSounds(): void {
  throw new PendingPort("CL_RegisterSounds");
}

export function CL_ParseConfigString(): void {
  throw new PendingPort("CL_ParseConfigString");
}

export function CL_ParseServerMessage(): void {
  throw new PendingPort("CL_ParseServerMessage");
}

export function CL_LoadClientinfo(_ci: ClientinfoT, _s: string): void {
  throw new PendingPort("CL_LoadClientinfo");
}

export function SHOWNET(_s: string): void {
  throw new PendingPort("SHOWNET");
}

export function CL_ParseClientinfo(_player: number): void {
  throw new PendingPort("CL_ParseClientinfo");
}

export function CL_Download_f(): void {
  throw new PendingPort("CL_Download_f");
}
