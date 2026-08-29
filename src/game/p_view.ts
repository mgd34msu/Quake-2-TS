// p_view.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { EdictT } from "./g_local";

export function ClientEndServerFrame(ent: EdictT): void {
  throw new PendingPort("p_view.c:ClientEndServerFrame");
}
