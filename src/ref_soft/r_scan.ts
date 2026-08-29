/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_scan.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_scan.c throws PendingPort until the real
module lands. `D_DrawTurbulent8Span` is a static internal helper (not
declared in r_local.h) and is not stubbed individually.
*/

import { PendingPort } from "../qcommon/pending";
import type { EspanT } from "./r_local";

export function D_WarpScreen(): void {
  throw new PendingPort("D_WarpScreen");
}

export function Turbulent8(pspan: EspanT): void {
  throw new PendingPort("Turbulent8");
}

export function NonTurbulent8(pspan: EspanT): void {
  throw new PendingPort("NonTurbulent8");
}

export function D_DrawSpans16(pspan: EspanT): void {
  throw new PendingPort("D_DrawSpans16");
}

export function D_DrawZSpans(pspan: EspanT): void {
  throw new PendingPort("D_DrawZSpans");
}
