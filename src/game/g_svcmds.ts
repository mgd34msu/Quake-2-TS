// g_svcmds.c -- pending port

import { PendingPort } from "../qcommon/pending";

export function ServerCommand(): void {
  throw new PendingPort("g_svcmds.c:ServerCommand");
}

export function SV_FilterPacket(from: string): boolean {
  throw new PendingPort("g_svcmds.c:SV_FilterPacket");
}
